export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const data = req.body || {};
    console.log("WEBHOOK HIT:", JSON.stringify(data));

    const fullName = data.name || "";
    const parts = fullName.trim().split(" ");
    const firstName = data.firstName || parts[0] || "Unknown";
    const lastName = data.lastName || parts.slice(1).join(" ") || "Unknown";

    const email = data.email || "test@test.com";
    const phone = data.phone || data.phoneNumber || "0000000000";
    const address =
      data.address ||
      data.appointment_location ||
      data.appointmentLocation ||
      "Unknown Address";

    const query = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client {
            id
            firstName
            lastName
          }
        }
      }
    `;

    const variables = {
      input: {
        firstName,
        lastName,
        emails: [{ address: email }],
        phones: [{ number: phone }],
        billingAddress: {
          street1: address
        }
      }
    };

    console.log("JOBBER VARIABLES:", JSON.stringify(variables));

    const response = await fetch("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer YOUR_NEW_TOKEN_HERE",
        "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    const text = await response.text();
    console.log("JOBBER STATUS:", response.status);
    console.log("JOBBER RAW RESPONSE:", text);

    return res.status(200).json({
      success: true,
      jobberStatus: response.status,
      jobberRaw: text
    });
  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
