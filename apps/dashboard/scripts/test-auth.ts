#!/usr/bin/env tsx

/**
 * Authentication Flow Test Script
 * 
 * This script tests the authentication endpoints to ensure they're working correctly.
 * Run this after starting both the API worker and dashboard.
 */

const API_BASE_URL = "http://localhost:8787";
const DASHBOARD_URL = "http://localhost:3001";

async function testAuthFlow() {
  console.log("🧪 Testing Lynkby Authentication Flow...\n");

  try {
    // Test 1: Health Check
    console.log("1️⃣ Testing API health check...");
    const healthResponse = await fetch(`${API_BASE_URL}/_health`);
    if (healthResponse.ok) {
                 const health = await healthResponse.json() as { status: string };
           console.log("   ✅ API is healthy:", health.status);
    } else {
      console.log("   ❌ API health check failed");
      return;
    }

    // Test 2: Auth endpoints info
    console.log("\n2️⃣ Testing auth endpoints info...");
    const authInfoResponse = await fetch(`${API_BASE_URL}/v1/auth`);
    if (authInfoResponse.ok) {
                 const authInfo = await authInfoResponse.json() as { service: string; endpoints: Record<string, unknown> };
           console.log("   ✅ Auth service info:", authInfo.service);
           console.log("   📋 Available endpoints:", Object.keys(authInfo.endpoints).length);
    } else {
      console.log("   ❌ Auth info endpoint failed");
    }

    // Test 3: Magic link request (this will fail without proper email validation)
    console.log("\n3️⃣ Testing magic link request...");
    const magicLinkResponse = await fetch(`${API_BASE_URL}/v1/auth/request-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" })
    });
    
    if (magicLinkResponse.ok) {
                   const magicLink = await magicLinkResponse.json() as { message: string };
             console.log("   ✅ Magic link request successful:", magicLink.message);
    } else {
                   const error = await magicLinkResponse.json() as { error: string };
             console.log("   ⚠️  Magic link request failed (expected without email service):", error.error);
    }

    // Test 4: Check dashboard accessibility
    console.log("\n4️⃣ Testing dashboard accessibility...");
    try {
      const dashboardResponse = await fetch(DASHBOARD_URL);
      if (dashboardResponse.ok) {
        console.log("   ✅ Dashboard is accessible");
      } else {
        console.log("   ❌ Dashboard returned status:", dashboardResponse.status);
      }
    } catch (error) {
      console.log("   ❌ Dashboard is not accessible:", error instanceof Error ? error.message : "Unknown error");
    }

    console.log("\n🎉 Authentication flow test completed!");
    console.log("\n📋 Next steps:");
    console.log("   1. Ensure API worker is running on port 8787");
    console.log("   2. Ensure dashboard is running on port 3001");
    console.log("   3. Set up email service (Resend) for magic links");
    console.log("   4. Test full flow with real email");

  } catch (error) {
    console.error("❌ Test failed:", error instanceof Error ? error.message : "Unknown error");
  }
}

// Run the test
testAuthFlow();
