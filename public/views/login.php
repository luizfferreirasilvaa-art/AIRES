<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>AIRES — Acesso Seguro</title>
    
    <!-- Google Fonts Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        dark: {
                            base: '#070709',
                            card: '#121216',
                            surface: '#18181f',
                            border: 'rgba(255, 255, 255, 0.08)'
                        },
                        lime: {
                            glow: '#bef264',
                            accent: '#a3e635'
                        }
                    }
                }
            }
        }
    </script>
    
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body class="bg-[#070709] text-zinc-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden antialiased selection:bg-lime-400 selection:text-black">

    <!-- Ambient Glow Blobs (Pierre Fintech Aesthetics) -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[130px] pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-lime-500/15 rounded-full blur-[130px] pointer-events-none"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[160px] pointer-events-none"></div>

    <!-- Login Container Card -->
    <div class="w-full max-w-md relative z-10">
        
        <!-- Glass Card -->
        <div class="glass-card rounded-[2.2rem] p-7 sm:p-9 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            
            <!-- Top Subtle Shimmer Line -->
            <div class="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-lime-400/50 to-transparent"></div>

            <!-- Header / Brand -->
            <div class="flex flex-col items-center text-center mb-8">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 via-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-orange-500/20 mb-4 ring-1 ring-white/20">
                    A
                </div>
                
                <h1 class="font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                    AIRES
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 font-extrabold uppercase tracking-wider border border-lime-400/30">PRO</span>
                </h1>
                
                <p class="text-xs text-zinc-400 font-medium mt-1">
                    Segundo Cérebro • Acesso do Administrador
                </p>
            </div>

            <!-- Alert / Error Message -->
            <div id="login-alert" class="hidden mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 transition-all">
                <svg class="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span id="login-alert-text">Credenciais inválidas.</span>
            </div>

            <!-- Login Form -->
            <form id="form-login" class="space-y-4" onsubmit="handleLogin(event)">
                
                <div>
                    <label class="block text-xs font-bold text-zinc-300 mb-1.5 ml-1">
                        Usuário ou E-mail
                    </label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="login-username" 
                            name="login"
                            required
                            autocomplete="username"
                            placeholder="admin ou admin@aires.io"
                            class="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400/80 focus:ring-1 focus:ring-lime-400/80 transition-all font-medium"
                        >
                        <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1.5 ml-1">
                        <label class="block text-xs font-bold text-zinc-300">
                            Senha de Acesso
                        </label>
                        <span class="text-[10px] text-zinc-500 font-medium">Acesso Único</span>
                    </div>
                    <div class="relative">
                        <input 
                            type="password" 
                            id="login-password" 
                            name="senha"
                            required
                            autocomplete="current-password"
                            placeholder="••••••••"
                            class="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400/80 focus:ring-1 focus:ring-lime-400/80 transition-all font-medium pr-11"
                        >
                        <button 
                            type="button" 
                            id="btn-toggle-password" 
                            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            onclick="togglePasswordVisibility()"
                        >
                            <svg id="eye-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    id="btn-submit"
                    class="w-full mt-2 py-3.5 px-6 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-lime-400/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <span id="btn-submit-text">Entrar no Segundo Cérebro</span>
                    <svg id="btn-submit-arrow" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </form>

            <!-- Admin Credentials Helper Pill -->
            <div class="mt-6 pt-5 border-t border-white/5 flex flex-col items-center gap-2.5">
                <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Credenciais Pré-configuradas (Admin)</span>
                <button 
                    type="button" 
                    onclick="fillAdminCredentials()"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-all group"
                    title="Clique para preencher automaticamente"
                >
                    <span class="w-2 h-2 rounded-full bg-lime-400 shadow-sm shadow-lime-400"></span>
                    <span class="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200">admin@aires.io</span>
                    <span class="text-zinc-600">•</span>
                    <span class="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200">admin123</span>
                    <span class="text-[9px] bg-white/10 text-lime-400 px-1.5 py-0.2 rounded-md font-bold ml-1">Preencher</span>
                </button>
            </div>

        </div>

        <!-- Security / Status Footer -->
        <p class="text-center text-[10px] text-zinc-600 font-medium mt-4">
            Ambiente Seguro • Sessões Criptografadas com PDO MySQL
        </p>
    </div>

    <script>
        function togglePasswordVisibility() {
            const input = document.getElementById('login-password');
            const icon = document.getElementById('eye-icon');
            if (input.type === 'password') {
                input.type = 'text';
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path>';
            } else {
                input.type = 'password';
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
            }
        }

        function fillAdminCredentials() {
            document.getElementById('login-username').value = 'admin@aires.io';
            document.getElementById('login-password').value = 'admin123';
            document.getElementById('login-password').focus();
        }

        async function handleLogin(e) {
            e.preventDefault();

            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('btn-submit');
            const btnText = document.getElementById('btn-submit-text');
            const alertBox = document.getElementById('login-alert');
            const alertText = document.getElementById('login-alert-text');

            if (!username || !password) return;

            // Loading state
            btn.disabled = true;
            btnText.innerText = 'Autenticando...';
            alertBox.classList.add('hidden');

            try {
                // Determine API base url
                const pathname = window.location.pathname;
                let baseUrl = '';
                if (pathname.includes('/public')) {
                    baseUrl = pathname.substring(0, pathname.indexOf('/public') + 7);
                } else if (pathname.includes('/AIRES')) {
                    baseUrl = '/AIRES';
                }

                const res = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        login: username,
                        senha: password
                    })
                });

                const data = await res.json();

                if (!res.ok || !data.sucesso) {
                    throw new Error(data.erro || 'Falha ao autenticar.');
                }

                btnText.innerText = 'Acesso Liberado! Entrando...';
                btn.classList.remove('bg-lime-400');
                btn.classList.add('bg-white');

                // Redirect
                window.location.href = data.redirecionar || `${baseUrl}/`;

            } catch (err) {
                alertText.innerText = err.message;
                alertBox.classList.remove('hidden');
                btn.disabled = false;
                btnText.innerText = 'Entrar no Segundo Cérebro';
            }
        }
    </script>
</body>
</html>
