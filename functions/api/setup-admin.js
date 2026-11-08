
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buat Admin | Mining Insight Indonesia</title>
<style>
body{background:#07130f;color:white;font-family:Arial;padding:25px}
main{max-width:420px;margin:50px auto;background:#10251c;padding:25px;border-radius:12px}
input,button{box-sizing:border-box;width:100%;padding:13px;margin:9px 0;border-radius:6px}
input{border:1px solid #777}
button{background:#c4a45b;border:0;font-weight:bold}
</style>
</head>
<body>
<main>
<h2>ADMINISTRATOR PERTAMA</h2>
<p>Mining Insight Indonesia</p>
<form id="setupForm">
<input id="username" placeholder="Username admin" required>
<input id="password" type="password" placeholder="Password minimal 12 karakter" required>
<input id="secret" type="password" placeholder="ADMIN_SETUP_SECRET" required>
<button>Buat Akun Administrator</button>
</form>
<p id="result"></p>
</main>
<script>
document.getElementById("setupForm").onsubmit=async function(e){
e.preventDefault();
const result=document.getElementById("result");
result.textContent="Memproses...";
try{
const response=await fetch("/api/setup-admin",{
method:"POST",
headers:{
"Content-Type":"application/json",
"X-Setup-Secret":document.getElementById("secret").value
},
body:JSON.stringify({
username:document.getElementById("username").value,
password:document.getElementById("password").value
})
});
const data=await response.json();
result.textContent=data.message;
if(data.success)this.reset();
}catch(error){
result.textContent="Gagal menghubungi server.";
}
};
</script>
</body>
</html>
