// hash-password.js
const bcrypt = require('bcryptjs');

// ------------------------------------
// 1. MUDE "senha123" para a senha que você quer
const suaSenha = "1234"; 
// ------------------------------------

const saltRounds = 10;

bcrypt.hash(suaSenha, saltRounds, function(err, hash) {
    if (err) {
        console.error("Erro ao gerar hash:", err);
        return;
    }

    console.log("\nSua senha simples:", suaSenha);
    console.log("\n--- COPIE O HASH ABAIXO (começa com $2a) ---");
    console.log(hash);
    console.log("--- COPIE O HASH ACIMA ---\n");
});