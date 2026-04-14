export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const data = req.body || {};
    console.log("WEBHOOK HIT:", JSON.stringify(data));

    const fullName = data.name || "";
    const splitName = fullName.trim().split(" ");
    const firstName = data.firstName || splitName[0] || "Unknown";
    const lastName = data.lastName || splitName.slice(1).join(" ") || "Unknown";

    const email = data.email || "test@test.com";
    const phone = data.phone || data.phoneNumber || "0000000000";
    const address =
      data.address ||
      data.appointment_location ||
      data.appointmentLocation ||
      "Unknown Address";

    const query = `
      mutation CreateClient(
        $firstName: String!,
        $lastName: String!,
        $email: String!,
        $phone: String!,
        $street1: String!
      ) {
        clientCreate(
          input: {
            firstName: $firstName
            lastName: $lastName
            emails: [{ address: $email }]
            phones: [{ number: $phone }]
            billingAddress: { street1: $street1 }
          }
        ) {
          client {
            id
            firstName
            lastName
          }
        }
      }
    `;

    const variables = {
      firstName,
      lastName,
      email,
      phone,
      street1: address
    };

    console.log("JOBBER VARIABLES:", JSON.stringify(variables));

    const response = await fetch("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjM2MzU5MzYsImlzcyI6Imh0dHBzOi8vYXBpLmdldGpvYmJlci5jb20iLCJjbGllbnRfaWQiOiJhMzM4NWFiYi1iNWI0LTQ4NjctODIzZi0xMTgzM2E1MjFiYzkiLCJzY29wZSI6InJlYWRfY2xpZW50cyB3cml0ZV9jbGllbnRzIHJlYWRfcXVvdGVzIHdyaXRlX3F1b3RlcyByZWFkX2pvYnMgd3JpdGVfam9icyByZWFkX2ludm9pY2VzIHdyaXRlX2ludm9pY2VzIHJlYWRfam9iYmVyX3BheW1lbnRzIiwiYXBwX2lkIjoiYTMzODVhYmItYjViNC00ODY3LTgyM2YtMTE4MzNhNTIxYmM5IiwidXNlcl9pZCI6MzYzNTkzNiwiYWNjb3VudF9pZCI6MjE0NDQ3MywiZXhwIjoxNzc2MTM0MDY4fQ.SVNKtHq0wkQLZ70GW6PVQHWG35OcWEejaZWZO9gNPC8",
        "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    console.log("JOBBER STATUS:", response.status);
    console.log("JOBBER RESPONSE:", JSON.stringify(result));

    return res.status(200).json({
      success: true,
      jobberStatus: response.status,
      jobber: result
    });
  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
