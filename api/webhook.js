export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body || {};
    console.log("WEBHOOK HIT:", JSON.stringify(data));

    // Repcard field mapping
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

    const jobCost = Number(data["Job cost"] || data.jobCost || data.price || 0);
    const depositAmount = Number((jobCost * 0.5).toFixed(2));

    console.log(
      "MAPPED DATA:",
      JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        address,
        jobCost,
        depositAmount
      })
    );

    async function jobberRequest(query, variables = {}) {
      const response = await fetch("https://api.getjobber.com/api/graphql", {
        method: "POST",
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjM2MzU5MzYsImlzcyI6Imh0dHBzOi8vYXBpLmdldGpvYmJlci5jb20iLCJjbGllbnRfaWQiOiJhMzM4NWFiYi1iNWI0LTQ4NjctODIzZi0xMTgzM2E1MjFiYzkiLCJzY29wZSI6InJlYWRfY2xpZW50cyB3cml0ZV9jbGllbnRzIHJlYWRfcXVvdGVzIHdyaXRlX3F1b3RlcyByZWFkX2pvYnMgd3JpdGVfam9icyByZWFkX2ludm9pY2VzIHdyaXRlX2ludm9pY2VzIHJlYWRfam9iYmVyX3BheW1lbnRzIiwiYXBwX2lkIjoiYTMzODVhYmItYjViNC00ODY3LTgyM2YtMTE4MzNhNTIxYmM5IiwidXNlcl9pZCI6MzYzNTkzNiwiYWNjb3VudF9pZCI6MjE0NDQ3MywiZXhwIjoxNzc2Mjg5NzYyfQ.84niKTl_TLJr5_MN3HSG58be3DRhB7QX80KUKmsn3KU",
          "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, variables })
      });

      const raw = await response.text();
      console.log("JOBBER STATUS:", response.status);
      console.log("JOBBER RAW RESPONSE:", raw);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      if (!response.ok || parsed.errors) {
        throw new Error(`Jobber error: ${raw}`);
      }

      return parsed;
    }

    // 1) Create client
    const clientInput = {
      firstName,
      lastName,
      emails: [{ address: email }]
    };

    if (phone) {
      clientInput.phones = [{ number: phone }];
    }

    if (address) {
      clientInput.billingAddress = { street1: address };
    }

    const createClientQuery = `
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

    const clientResult = await jobberRequest(createClientQuery, {
      input: clientInput
    });

    const clientCreate = clientResult?.data?.clientCreate;
    if (clientCreate?.userErrors?.length) {
      throw new Error(
        `Client create userErrors: ${JSON.stringify(clientCreate.userErrors)}`
      );
    }

    const clientId = clientCreate?.client?.id;
    if (!clientId) {
      throw new Error("Client was not created.");
    }

    console.log("CLIENT ID:", clientId);

    // 2) Create job
    // Jobber's schema changes; this matches the current pattern that your logs were pointing to.
    const createJobQuery = `
      mutation CreateJob($input: JobCreateAttributes!) {
        jobCreate(attributes: $input) {
          job {
            id
            title
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const jobInput = {
      clientId,
      title: "LumiLuxe Install"
    };

    const jobResult = await jobberRequest(createJobQuery, {
      input: jobInput
    });

    const jobCreate = jobResult?.data?.jobCreate;
    if (jobCreate?.userErrors?.length) {
      throw new Error(
        `Job create userErrors: ${JSON.stringify(jobCreate.userErrors)}`
      );
    }

    const jobId = jobCreate?.job?.id;
    if (!jobId) {
      throw new Error("Job was not created.");
    }

    console.log("JOB ID:", jobId);

    // 3) Create invoice for 50% deposit
    // If this mutation name/type differs in your schema, Vercel logs will show the exact mismatch.
    const createInvoiceQuery = `
      mutation CreateInvoice($input: InvoiceCreateAttributes!) {
        invoiceCreate(attributes: $input) {
          invoice {
            id
            subject
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const invoiceInput = {
      clientId,
      jobs: [jobId],
      subject: "50% Deposit",
      lineItems: [
        {
          name: "50% Deposit",
          quantity: 1,
          unitPrice: depositAmount
        }
      ]
    };

    const invoiceResult = await jobberRequest(createInvoiceQuery, {
      input: invoiceInput
    });

    const invoiceCreate = invoiceResult?.data?.invoiceCreate;
    if (invoiceCreate?.userErrors?.length) {
      throw new Error(
        `Invoice create userErrors: ${JSON.stringify(invoiceCreate.userErrors)}`
      );
    }

    const invoiceId = invoiceCreate?.invoice?.id;
    if (!invoiceId) {
      throw new Error("Invoice was not created.");
    }

    console.log("INVOICE ID:", invoiceId);

    // 4) Send invoice
    const sendInvoiceQuery = `
      mutation SendInvoice($invoiceId: EncodedId!) {
        invoiceSend(id: $invoiceId) {
          success
          userErrors {
            message
            path
          }
        }
      }
    `;

    const sendResult = await jobberRequest(sendInvoiceQuery, {
      invoiceId
    });

    const invoiceSend = sendResult?.data?.invoiceSend;
    if (invoiceSend?.userErrors?.length) {
      throw new Error(
        `Invoice send userErrors: ${JSON.stringify(invoiceSend.userErrors)}`
      );
    }

    return res.status(200).json({
      success: true,
      createdClientId: clientId,
      createdJobId: jobId,
      createdInvoiceId: invoiceId,
      depositAmount
    });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
