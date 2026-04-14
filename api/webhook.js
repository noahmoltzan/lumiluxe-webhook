export default async function handler(req, res) {
  try {
    const data = req.body;

    console.log("WEBHOOK HIT:", data);

    // Pull data from Repcard
    const firstName = data.firstName || "";
    const lastName = data.lastName || "";
    const email = data.email || "";
    const phone = data.phone || "";
    const address = data.address || "";
    const price = data.price || "";

    const response = await fetch("https://api.getjobber.com/api/graphql", {
      method: "POST",
      headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjM2MzU5MzYsImlzcyI6Imh0dHBzOi8vYXBpLmdldGpvYmJlci5jb20iLCJjbGllbnRfaWQiOiJhMzM4NWFiYi1iNWI0LTQ4NjctODIzZi0xMTgzM2E1MjFiYzkiLCJzY29wZSI6InJlYWRfY2xpZW50cyB3cml0ZV9jbGllbnRzIHJlYWRfcXVvdGVzIHdyaXRlX3F1b3RlcyByZWFkX2pvYnMgd3JpdGVfam9icyByZWFkX2ludm9pY2VzIHdyaXRlX2ludm9pY2VzIHJlYWRfam9iYmVyX3BheW1lbnRzIiwiYXBwX2lkIjoiYTMzODVhYmItYjViNC00ODY3LTgyM2YtMTE4MzNhNTIxYmM5IiwidXNlcl9pZCI6MzYzNTkzNiwiYWNjb3VudF9pZCI6MjE0NDQ3MywiZXhwIjoxNzc2MTMwNjY0fQ.6boz4uZeIezYVtkoD5NxZfvGydSl7s29uhVwXfZfnmY",
        "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          mutation {
            clientCreate(input: {
              firstName: "${firstName}",
              lastName: "${lastName}",
              emails: [{ address: "${email}" }],
              phones: [{ number: "${phone}" }],
              billingAddress: {
                street1: "${address}"
              }
            }) {
              client {
                id
                firstName
                lastName
              }
            }
          }
        `
      })
    });

    const result = await response.json();

    console.log("JOBBER RESPONSE:", result);

    res.status(200).json({
      success: true,
      jobber: result
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
