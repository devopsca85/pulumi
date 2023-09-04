import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";

const resourceGroup = new azure.core.ResourceGroup("resourceGroup");

const frontdoorExample = new azure_native.network.FrontDoor("example", {
    resourceGroupName: resourceGroup.name,
    location: "global",
    enforceBackendPoolsCertificateNameCheck: false,
    frontendEndpoints: [{
        name: "frontend-endpoint1",
        hostName: "examplefrontdoor50c0a30.azurefd.net",
        //sessionAffinityEnabled: false,
       // sessionAffinityTtlSeconds: 0,
      //  webApplicationFirewallPolicyLink: {
      //      id: "some-id",
      //  },
    }],
    backendPools: [{
        name: "example-backendpool",
        backends: [{
            address: "example.com",
            enabledState: "Enabled",
            httpPort: 80,
            httpsPort: 443,
            priority: 1,
            weight: 50
        }],
        healthProbeSettings: {
            name: "example-healthprobe",
        },
        loadBalancingSettings: {
            name: "example-loadbalancingsettings",
        },
    }],
    healthProbeSettings: [{
        name: "example-healthprobe",
        enabledState: "Enabled",
        path: "/",
        probeMethod: "HEAD",
        protocol: "Http",
    }],
    loadBalancingSettings: [{
        name: "example-loadbalancingsettings",
        additionalLatencyMilliseconds: 0,
        sampleSize: 4,
        successfulSamplesRequired: 2
    }],
    routingRules: [{
        name: "example-routingrule",
        acceptedProtocols: ["Https"],
        enabledState: "Enabled",
        frontendEndpoints: ["frontend-endpoint1"],
        patternsToMatch: ["/*"],
        routeConfiguration: {
            forwardingConfiguration: {
                backendPoolName: "example-backendpool",
                customForwardingPath: "/",
                forwardingProtocol: "HttpsOnly",
                cacheUseDynamicCompression: false
            },
        }
    }],
});

export const frontDoorUrl = frontdoorExample.defaultHostname;
