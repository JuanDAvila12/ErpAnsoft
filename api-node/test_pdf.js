const jwt = require("jsonwebtoken");
const http = require("http");

const token = jwt.sign(
  { usuario_id: 1, rol: "admin" },
  process.env.JWT_SECRET || "spi_erp_jwt_secret_key_2026",
  { expiresIn: "1h" }
);

console.log("Testing PDF generation via GET endpoint...");

http.get(
  `http://localhost:3000/api/v1/generar-pdf?tipo=venta&id=11&token=${token}`,
  (res) => {
    let chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      const buf = Buffer.concat(chunks);
      console.log("Status:", res.statusCode);
      console.log("Content-Type:", res.headers["content-type"]);
      console.log("Length:", buf.length);
      if (buf.length < 200 && (buf[0] !== 0x25 || buf.length < 50)) {
        console.log("Body:", buf.toString());
      } else {
        console.log(
          "PDF header OK:",
          buf[0].toString(16),
          buf[1].toString(16),
          buf[2].toString(16)
        );
      }
      process.exit(0);
    });
  }
).on("error", (e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
