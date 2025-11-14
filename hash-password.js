// test-hash.js
const bcrypt = require('bcryptjs');

// 1. O hash do banco de dados (que você forneceu)
const storedHash = '$2b$10$8kNU8J5ncoRSymRWJ8cxa.fCY9rpDv0BQZyfIG3ypI9gN4Q280T1i';

// 2. A senha que você ACHA que está correta.
// ATENÇÃO: Digite essa senha exatamente como você digita no app.
const passwordToTest = '2134'; // <--- Substitua pela senha!

async function testPassword() {
  const isValid = await bcrypt.compare(passwordToTest, storedHash);
  console.log(`A senha é válida? ${isValid}`);
}

testPassword();