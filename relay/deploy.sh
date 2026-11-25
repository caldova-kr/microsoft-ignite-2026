#!/usr/bin/env bash
# Deploy the GitHub device-flow relay to Azure Functions (Flex Consumption, Node 22).
# Storage is reached only over private endpoints with a user-assigned identity, because
# subscription policy disables public network access and shared keys on storage accounts.
#
#   RG=<resource group> LOC=<region> SUFFIX=<suffix> ./relay/deploy.sh   # first time: creates everything
#   GITHUB_CLIENT_ID=<app client id> ./relay/deploy.sh                            # set/rotate the client id, redeploy code
set -euo pipefail

RG=${RG:-<resource group>}
LOC=${LOC:-<region>}
SUFFIX=${SUFFIX:-<suffix>}
ST=st<name>$SUFFIX
FN=func-<name>-$SUFFIX
VNET=vnet-<name>
ID=id-<name>
ORIGINS=${ALLOWED_ORIGINS:-https://caldova-kr.github.io,http://127.0.0.1:8000}
HERE=$(cd "$(dirname "$0")" && pwd)

if ! az functionapp show -n "$FN" -g "$RG" -o none 2>/dev/null; then
  az group create -n "$RG" -l "$LOC" --tags purpose=ignite-notes-auth-relay -o none
  az storage account create -n "$ST" -g "$RG" -l "$LOC" --sku Standard_LRS --min-tls-version TLS1_2 --allow-blob-public-access false -o none
  az network vnet create -g "$RG" -n "$VNET" -l "$LOC" --address-prefixes 10.20.0.0/16 --subnet-name func --subnet-prefixes 10.20.1.0/24 -o none
  az network vnet subnet update -g "$RG" --vnet-name "$VNET" -n func --delegations Microsoft.App/environments -o none
  az network vnet subnet create -g "$RG" --vnet-name "$VNET" -n pe --address-prefixes 10.20.2.0/24 -o none
  SID=$(az storage account show -n "$ST" -g "$RG" --query id -o tsv)
  for svc in blob queue table; do
    Z=privatelink.$svc.core.windows.net
    az network private-dns zone create -g "$RG" -n "$Z" -o none
    az network private-dns link vnet create -g "$RG" -z "$Z" -n "link-$svc" -v "$VNET" -e false -o none
    az network private-endpoint create -g "$RG" -n "pe-$ST-$svc" -l "$LOC" --vnet-name "$VNET" --subnet pe \
      --private-connection-resource-id "$SID" --group-id "$svc" --connection-name "conn-$svc" -o none
    az network private-endpoint dns-zone-group create -g "$RG" --endpoint-name "pe-$ST-$svc" -n default --private-dns-zone "$Z" --zone-name "$svc" -o none
  done
  az identity create -g "$RG" -n "$ID" -l "$LOC" -o none
  PID=$(az identity show -g "$RG" -n "$ID" --query principalId -o tsv)
  for role in "Storage Blob Data Owner" "Storage Queue Data Contributor" "Storage Table Data Contributor"; do
    az role assignment create --assignee-object-id "$PID" --assignee-principal-type ServicePrincipal --role "$role" --scope "$SID" -o none
  done
  UID_=$(az identity show -g "$RG" -n "$ID" --query id -o tsv)
  az functionapp create -n "$FN" -g "$RG" --storage-account "$ST" --flexconsumption-location "$LOC" --runtime node --runtime-version 22 \
    --vnet "$VNET" --subnet func --assign-identity "$UID_" \
    --deployment-storage-auth-type UserAssignedIdentity --deployment-storage-auth-value "$UID_" --disable-app-insights -o none
  CID=$(az identity show -g "$RG" -n "$ID" --query clientId -o tsv)
  az functionapp config appsettings delete -n "$FN" -g "$RG" --setting-names AzureWebJobsStorage -o none
  az functionapp config appsettings set -n "$FN" -g "$RG" -o none --settings \
    "AzureWebJobsStorage__accountName=$ST" AzureWebJobsStorage__credential=managedidentity "AzureWebJobsStorage__clientId=$CID"
fi

az functionapp config appsettings set -n "$FN" -g "$RG" -o none --settings "ALLOWED_ORIGINS=$ORIGINS" ${GITHUB_CLIENT_ID:+"GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID"}
# The platform answers CORS preflight; the function itself still rejects other origins.
az functionapp cors remove -n "$FN" -g "$RG" --allowed-origins -o none 2>/dev/null || true
az functionapp cors add -n "$FN" -g "$RG" --allowed-origins ${ORIGINS//,/ } -o none

(cd "$HERE" && npm install --omit=dev --silent)
ZIP=$(mktemp -d)/relay.zip
(cd "$HERE" && zip -qr "$ZIP" host.json package.json src node_modules)
az functionapp deployment source config-zip -g "$RG" -n "$FN" --src "$ZIP" -o none
echo "relay: https://$FN.azurewebsites.net/api/github"
