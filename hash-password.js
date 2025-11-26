// test-hash.js
const bcrypt = require('bcryptjs'); 

// 1. O hash do banco de dados (COLE AQUI O HASH DO PASSO 1)
const storedHash = '$2b$10$37fHI9.LCc13OokfwFfim.MAsxq0z22.cRHkPjwVmjFGKmSQjsGt.'; 

// 2. A senha que você ACHA que está correta (TEXTO PURO)
const passwordToTest = 'senha'; // <--- Substitua pela senha!

async function testPassword() {
  // Use bcryptjs.compare, pois sua aplicação usa bcrypt para a comparação
  const isValid = await bcrypt.compare(passwordToTest, storedHash);
  console.log(`A senha é válida? ${isValid}`);
}

testPassword();