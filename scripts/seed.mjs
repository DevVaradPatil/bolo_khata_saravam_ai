// Demo data: wipes ALL shops (and their customers and entries), then creates one demo shop.
// Run: npm run db:seed
import pg from "pg";

process.loadEnvFile(".env.local");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });

// [name, name in the other script, phone, language]
const people = [
  ["Ramesh Kumar", "रमेश कुमार", "9822012345", "hi-IN"],
  ["Ramesh Dairy", "रमेश डेयरी", "9890011122", "hi-IN"],
  ["Sunita Patil", "सुनीता पाटिल", "9767033344", "mr-IN"],
  ["Ganesh Kale", "गणेश काळे", "9422055566", "mr-IN"],
  ["Abdul Bhai", "अब्दुल भाई", "9021077788", "hi-IN"],
  ["Priya Sharma", "प्रिया शर्मा", "9158099900", "en-IN"],
  ["Meena Jadhav", "मीना जाधव", null, "mr-IN"],
  ["Vikram Singh", "विक्रम सिंह", "9970012121", "hi-IN"],
];

// [customer index, type, rupees, note, days ago, hour]
const ledger = [
  [0, "credit", 650, "Atta 10kg, tel", 13, 10],
  [0, "payment", 300, "Cash", 9, 18],
  [0, "credit", 650, "Chawal, dal", 2, 11],
  [1, "credit", 400, "Doodh ka hisaab", 6, 8],
  [2, "credit", 1200, "Mahine ka saamaan", 12, 17],
  [2, "payment", 450, "UPI", 3, 19],
  [3, "credit", 220, "Sakhar, chaha powder", 1, 9],
  [5, "credit", 1500, "Party order", 8, 16],
  [6, "credit", 340, "Sabun, toothpaste", 4, 12],
  [7, "credit", 900, "Biscuit cartons", 5, 15],
  [7, "payment", 900, "Cash", 0, 10],
  [6, "payment", 100, "Cash", 0, 11],
  [2, "credit", 180, "Bread, anda", 0, 9],
];

await client.connect();
try {
  await client.query("begin");
  await client.query("delete from shops");
  const { rows: [shop] } = await client.query(
    "insert into shops (name, language) values ($1, 'hi-IN') returning id",
    ["Sharma Kirana Store"],
  );
  const ids = [];
  for (const [name, alt, phone, language] of people) {
    const { rows: [c] } = await client.query(
      "insert into customers (shop_id, name, name_alt, phone, language) values ($1, $2, $3, $4, $5) returning id",
      [shop.id, name, alt, phone, language],
    );
    ids.push(c.id);
  }
  for (const [i, type, rupees, note, daysAgo, hour] of ledger) {
    // Times are IST wall-clock hours, `daysAgo` days back.
    await client.query(
      `insert into entries (shop_id, customer_id, type, amount_paise, note, created_at)
       values ($1, $2, $3, $4, $5,
         (date_trunc('day', now() at time zone 'Asia/Kolkata') - make_interval(days => $6) + make_interval(hours => $7)) at time zone 'Asia/Kolkata')`,
      [shop.id, ids[i], type, rupees * 100, note, daysAgo, hour],
    );
  }
  await client.query("commit");
  console.log(`Seeded "Sharma Kirana Store": ${people.length} customers, ${ledger.length} entries.`);
} catch (e) {
  await client.query("rollback");
  throw e;
} finally {
  await client.end();
}
