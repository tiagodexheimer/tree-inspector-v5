// generate-hash.js
const bcrypt = require('bcryptjs'); // <-- USA 'bcryptjs'

// ------------------------------------
// 1. Coloque a senha simples que você VAI USAR no login
const suaSenhaSimples = "1234"; 
// ------------------------------------

const saltRounds = 10;

bcrypt.hash(suaSenhaSimples, saltRounds, function(err, hash) {
    if (err) {
        console.error("Erro ao gerar hash:", err);
        return;
    }

    console.log("\nSua senha simples:", suaSenhaSimples);
    console.log("\n--- COPIE O NOVO HASH ABAIXO ---");
    console.log(hash);
    console.log("--- COPIE O NOVO HASH ACIMA ---\n");
});