import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import * as containerservice from "@pulumi/azure-native/containerservice";
import * as compute from "@pulumi/azure-native/compute";
import * as azure_native from "@pulumi/azure-native";

// Config and defaults
const location = "EastUS2";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("demo-rg", {
    location: location,
    name: "demo-rg",
});

// Create an Azure Virtual Network
const vnet = new azure.network.VirtualNetwork("demo2023", {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    addressSpaces: ["10.0.0.0/16"],
    name: "demo2023",
});

// Create an Azure KeyVault
const keyVault = new azure.keyvault.KeyVault("demo-kv", {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    skuName: "standard",
    tenantId: "<YOUR_AZURE_AD_TENANT_ID>",
    name: "demo-kv",
});

// Create an Azure App Configuration
const appConfig = new azure.appconfiguration.ConfigurationStore("demo-cfg", {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    sku: "standard",
    name: "demo-cfg",
});

// Create a private Azure Kubernetes Cluster
const kubernetesCluster = new azure.containerservice.KubernetesCluster("gwr-demo-aks", {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    defaultNodePool: {
        name: "default",
        nodeCount: 1,
        vmSize: "Standard_D2_v2",
    },
    dnsPrefix: "aks",
    privateClusterEnabled: true,
    name: "gwr-demo-aks",
});

// Create Azure Front Door Premium
//const frontDoor = new azure.network.frontDoor("gwrdemoaks", {
  //  resourceGroupName: resourceGroup.name,
   // location: resourceGroup.location,
    // ... add more configurations as necessary
//});

export const resourceGroupName = resourceGroup.name;