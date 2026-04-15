export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body || {};
    console.log("WEBHOOK HIT:", JSON.stringify(data));

    const fullName = (data.name || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);

    const firstName = data.firstName || parts[0] || "Unknown";
    const lastName = data.lastName || parts.slice(1).join(" ") || "Unknown";
    const email = data.email || "noemail@example.com";
    const phone = data.phone || data.phoneNumber || "";
    const address =
      data.address ||
      data.appointment_location ||
      data.appointmentLocation ||
      "";

    const input = {
      firstName,
      lastName,
      emails: [{ address: email }]
    };

    if (phone) {
      input.phones = [{ number: phone }];
    }

    if (address) {
      input.billingAddress = { street1: address };
    }

    const query = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client {
            id
            firstName
            lastName
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const response = await fetch("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjM2MzU5MzYsImlzcyI6Imh0dHBzOi8vYXBpLmdldGpvYmJlci5jb20iLCJjbGllbnRfaWQiOiJhMzM4NWFiYi1iNWI0LTQ4NjctODIzZi0xMTgzM2E1MjFiYzkiLCJzY29wZSI6InJlYWRfY2xpZW50cyB3cml0ZV9jbGllbnRzIHJlYWRfcXVvdGVzIHdyaXRlX3F1b3RlcyByZWFkX2pvYnMgd3JpdGVfam9icyByZWFkX2ludm9pY2VzIHdyaXRlX2ludm9pY2VzIHJlYWRfam9iYmVyX3BheW1lbnRzIiwiYXBwX2lkIjoiYTMzODVhYmItYjViNC00ODY3LTgyM2YtMTE4MzNhNTIxYmM5IiwidXNlcl9pZCI6MzYzNTkzNiwiYWNjb3VudF9pZCI6MjE0NDQ3MywiZXhwIjoxNzc2Mjg3ODM4fQ.8xe6ddFd5gOgUYU0wtddA7-6bFHTVC9kWzKyYz4l2EY",
        "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: { input }
      })
    });

    const raw = await response.text();
    console.log("JOBBER STATUS:", response.status);
    console.log("JOBBER RAW RESPONSE:", raw);

    return res.status(200).json({
      success: true,
      jobberStatus: response.status,
      jobberRaw: raw
    });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
