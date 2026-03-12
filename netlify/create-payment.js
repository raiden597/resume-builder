exports.handler = async (event) => {
  const { name, email } = JSON.parse(event.body || "{}");

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const referenceId = `resume_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: 9900,
      currency: "INR",
      description: "Full Resume Unlock",
      customer: {
        name: name || "User",
        ...(email ? { email } : {}),
      },
      reference_id: referenceId,
      callback_url: `${process.env.SITE_URL}/?paid=true`,
      callback_method: "get",
      expire_by: Math.floor(Date.now() / 1000) + 3600,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: data.error?.description || "Failed" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ url: data.short_url }),
  };
};