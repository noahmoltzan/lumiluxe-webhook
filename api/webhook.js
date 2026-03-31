export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("WEBHOOK HIT:", req.body);
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ message: "Webhook is live" });
}
