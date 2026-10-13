<?php
$userStreak = (int)($usuario['streak_dias'] ?? 0);
$userXp = (int)($usuario['xp'] ?? 0);
$totalActiveTasks = (int)(($metricas['planejamento'] ?? 0) + ($metricas['a_fazer'] ?? 0) + ($metricas['em_andamento'] ?? 0));
$concludedToday = (int)($metricas['hoje_concluidas'] ?? 0);
$concludedWeek = (int)($metricas['semana_concluidas'] ?? $metricas['concluidas'] ?? 0);
$focusRate = (int)($metricas['taxa_foco'] ?? 0);
$level = (int)floor($userXp / 100) + 1;
$xpInLevel = $userXp % 100;
$xpToNext = 100 - $xpInLevel;
$compMes = $compromissos_mes ?? [];
?>
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>AIRES — Execution Engine & Segundo Cérebro</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
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
                        },
                        orange: {
                            glow: '#fb923c',
                            accent: '#f97316'
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/styles.css">
    <script>
        if (localStorage.getItem('aires_sidebar_collapsed') === 'true') {
            document.documentElement.classList.add('sidebar-init-collapsed');
        }
    </script>
</head>
<body class="bg-[#070709] text-zinc-100 min-h-screen flex flex-col md:flex-row antialiased selection:bg-lime-400 selection:text-black">

    <!-- ========================================================
         DESKTOP SIDEBAR (Sleek Obsidian Dock)
         ======================================================== -->
    <aside id="app-sidebar" class="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#0b0b0e]/80 backdrop-blur-2xl p-5 sticky top-0 h-screen z-30 justify-between select-none">
        <div class="space-y-5">
            <!-- Brand & Toggle Collapse -->
            <div class="sidebar-brand-wrapper flex items-center justify-between px-1 py-1">
                <div class="flex items-center gap-3 sidebar-brand-info min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-500/20 shrink-0">
                        A
                    </div>
                    <div class="sidebar-text-collapsible overflow-hidden transition-all min-w-0">
                        <h1 class="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
                            AIRES
                            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-lime-400/20 text-lime-400 font-bold uppercase tracking-wider">PRO</span>
                        </h1>
                        <p class="text-[10px] text-zinc-400 font-medium whitespace-nowrap truncate">Segundo Cérebro • v1.0</p>
                    </div>
                </div>
                <button type="button" id="btn-toggle-sidebar" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all shrink-0 cursor-pointer" title="Recolher barra lateral">
                    <svg class="w-4 h-4 sidebar-collapse-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                </button>
            </div>

            <!-- New Task Button -->
            <button type="button" id="btn-desktop-new-task" class="sidebar-btn-new-task w-full py-3 px-4 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-lg shadow-white/10 flex items-center justify-center gap-2 transition-all active:scale-95" title="Criar Ação">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                <span class="sidebar-text-collapsible">Criar Ação</span>
            </button>

            <!-- Navigation Links -->
            <nav class="space-y-1">
                <!-- Geral -->
                <button type="button" data-nav-section="inicio" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all nav-active text-white bg-white/10 shadow-sm border border-white/5" title="Início">
                    <svg class="w-4 h-4 text-lime-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    <span class="sidebar-text-collapsible">Início</span>
                </button>

                <!-- Módulo: Produtividade -->
                <div class="sidebar-section-header pt-3 pb-1 px-3 flex items-center gap-2 select-none">
                    <span class="sidebar-text-collapsible text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Produtividade</span>
                    <div class="h-px bg-white/5 flex-1 sidebar-header-divider"></div>
                </div>
                <button type="button" data-nav-section="tarefas" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Execução & Tarefas">
                    <svg class="w-4 h-4 text-lime-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <span class="sidebar-text-collapsible">Execução & Tarefas</span>
                </button>
                <button type="button" data-nav-section="missoes" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Missões Estratégicas">
                    <svg class="w-4 h-4 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <span class="sidebar-text-collapsible">Missões Estratégicas</span>
                </button>
                <button type="button" data-nav-section="dashboard" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Produtividade & Foco">
                    <svg class="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    <span class="sidebar-text-collapsible">Produtividade & Foco</span>
                </button>

                <!-- Módulo: Conhecimento -->
                <div class="sidebar-section-header pt-3 pb-1 px-3 flex items-center gap-2 select-none">
                    <span class="sidebar-text-collapsible text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Conhecimento</span>
                    <div class="h-px bg-white/5 flex-1 sidebar-header-divider"></div>
                </div>
                <button type="button" data-nav-section="notas" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Notas">
                    <svg class="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <span class="sidebar-text-collapsible">Notas</span>
                </button>

                <!-- Módulo: Startup (Energia Solar) -->
                <div class="sidebar-section-header pt-3 pb-1 px-3 flex items-center gap-2 select-none">
                    <span class="sidebar-text-collapsible text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Startup</span>
                    <div class="h-px bg-white/5 flex-1 sidebar-header-divider"></div>
                </div>
                <button type="button" data-nav-section="startup-clientes" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Clientes & Contratos">
                    <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    <span class="sidebar-text-collapsible">Clientes</span>
                </button>
                <button type="button" data-nav-section="startup-faturamento" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Emissor & Painel de Faturas">
                    <svg class="w-4 h-4 text-lime-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path></svg>
                    <span class="sidebar-text-collapsible">Faturamento</span>
                </button>
                <button type="button" data-nav-section="startup-creditos" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Estoque de Créditos">
                    <svg class="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <span class="sidebar-text-collapsible">Créditos</span>
                </button>
                <button type="button" data-nav-section="startup-financeiro" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Financeiro & Inadimplência">
                    <svg class="w-4 h-4 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span class="sidebar-text-collapsible">Financeiro</span>
                </button>
                <button type="button" data-nav-section="startup-dashboard" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Dashboard Solar">
                    <svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    <span class="sidebar-text-collapsible">Dashboard Solar</span>
                </button>
                <button type="button" data-nav-section="startup-auditoria" class="sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Log de Auditoria">
                    <svg class="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span class="sidebar-text-collapsible">Auditoria</span>
                </button>
            </nav>
        </div>

        <!-- Gamification Capsule Bottom -->
        <div class="sidebar-gamification p-3.5 rounded-3xl bg-zinc-900/60 border border-white/5 space-y-2 transition-all" title="Nível <?= $level ?> • <?= $userStreak ?> dias de foco • <?= $userXp ?> XP">
            <div class="sidebar-text-collapsible flex items-center justify-between text-xs">
                <span class="font-bold flex items-center gap-1.5 text-orange-400">
                    🔥 <span id="stat-streak"><?= $userStreak ?> dias</span>
                </span>
                <span class="font-extrabold text-lime-400" id="stat-xp"><?= $userXp ?> XP</span>
            </div>
            <div class="sidebar-text-collapsible w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div id="level-progress-bar" class="bg-gradient-to-r from-orange-500 via-amber-400 to-lime-400 h-1.5 rounded-full transition-all" style="width: <?= $xpInLevel ?>%"></div>
            </div>
            <p id="level-text" class="sidebar-text-collapsible text-[10px] text-zinc-500 text-center font-medium">Nível <?= $level ?> • <?= $xpToNext ?> XP para o Nível <?= $level + 1 ?></p>

            <!-- Versão recolhida (mini) -->
            <div class="sidebar-gamification-mini hidden flex-col items-center justify-center gap-0.5 py-1">
                <span class="text-base leading-none">🔥</span>
                <span class="text-[10px] font-black text-orange-400"><?= $userStreak ?>d</span>
            </div>
        </div>
    </aside>

    <!-- ========================================================
         MAIN CANVAS (Ambient Atmosphere & Content)
         ======================================================== -->
    <main class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        
        <!-- Ambient Art Glow Background Header (Top Sunset Gradient) -->
        <div class="ambient-glow-header pt-6 pb-4 px-4 md:px-8 border-b border-white/[0.04] safe-top relative">
            
            <!-- Top Status Bar: User Greeting + Multi-Icon Group + Streak -->
            <div class="flex items-center justify-between gap-4 mb-4">
                <!-- User Profile / Greeting with Dropdown Trigger -->
                <div class="relative" id="user-menu-wrapper">
                    <button type="button" id="btn-user-menu" class="flex items-center gap-2.5 px-2.5 py-1.5 -ml-2 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group select-none">
                        <div class="relative">
                            <div class="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-purple-500 via-orange-400 to-amber-300 p-0.5 shadow-md shadow-orange-500/10">
                                <div class="w-full h-full rounded-full bg-[#121216] flex items-center justify-center font-bold text-xs text-white">
                                    ⚡
                                </div>
                            </div>
                            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-lime-400 ring-2 ring-[#070709]"></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div>
                                <h2 class="text-sm md:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                                    Olá, <span id="header-user-name"><?= htmlspecialchars($_SESSION['usuario_nome'] ?? 'Administrador') ?></span>
                                </h2>
                            </div>
                            <!-- Seta para baixo (Chevron Down) -->
                            <svg id="user-menu-chevron" class="w-4 h-4 text-zinc-400 group-hover:text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </button>

                    <!-- Pierre Glassmorphism Dropdown Menu -->
                    <div id="user-dropdown-menu" class="hidden absolute left-0 top-full mt-2 w-64 rounded-3xl bg-[#121217]/95 border border-white/10 shadow-2xl backdrop-blur-2xl p-2 z-50">
                        <!-- Header inside dropdown with User Info -->
                        <div class="px-3 py-2.5 border-b border-white/5 mb-1.5">
                            <p class="text-xs font-bold text-white"><?= htmlspecialchars($_SESSION['usuario_nome'] ?? 'Administrador') ?></p>
                            <p class="text-[10px] text-zinc-500 font-medium truncate"><?= htmlspecialchars($_SESSION['usuario_email'] ?? 'admin@aires.io') ?></p>
                        </div>

                        <!-- Option: Configurações -->
                        <button type="button" onclick="App.openSettingsModal()" class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-left group">
                            <div class="w-7 h-7 rounded-xl bg-white/5 group-hover:bg-lime-400/20 text-zinc-400 group-hover:text-lime-400 flex items-center justify-center transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </div>
                            <div>
                                <p class="font-bold text-xs text-zinc-200 group-hover:text-white">Configurações</p>
                                <p class="text-[10px] text-zinc-500">Preferências do sistema</p>
                            </div>
                        </button>

                        <div class="h-px bg-white/5 my-1"></div>

                        <!-- Option: Sair -->
                        <a href="<?= htmlspecialchars(\Aires\Core\Request::getBasePath() . '/logout') ?>" class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all group">
                            <div class="w-7 h-7 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            </div>
                            <div>
                                <p class="font-bold text-xs text-red-400 group-hover:text-red-300">Sair da Conta</p>
                                <p class="text-[10px] text-zinc-500">Encerrar sessão</p>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Right Micro Badges: Category Dots + Streak + XP -->
                <div class="flex items-center gap-2">
                    <!-- Modos de Foco & Contexto (Dropdown Trigger & Container) -->
                    <div class="relative" id="mode-switcher-wrapper">
                        <button type="button" id="btn-mode-switcher" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-white/20 shadow-inner transition-all select-none group" title="Alternar Modo de Contexto">
                            <div id="mode-pill-display" class="flex items-center -space-x-1.5">
                                <span class="w-5 h-5 rounded-full bg-purple-600/80 flex items-center justify-center text-[10px] shadow-sm">💼</span>
                                <span class="w-5 h-5 rounded-full bg-orange-600/80 flex items-center justify-center text-[10px] shadow-sm">👤</span>
                                <span class="w-5 h-5 rounded-full bg-cyan-600/80 flex items-center justify-center text-[10px] shadow-sm">🏢</span>
                            </div>
                            <span id="mode-active-label" class="text-[10px] font-extrabold text-zinc-300 hidden sm:inline">Todos</span>
                            <svg id="mode-chevron" class="w-3 h-3 text-zinc-500 group-hover:text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>

                        <!-- Dropdown Menu de Modos (Pierre Glassmorphism) -->
                        <div id="modes-dropdown-menu" class="hidden absolute right-0 top-full mt-2 w-72 rounded-3xl bg-[#121217]/95 border border-white/10 shadow-2xl backdrop-blur-2xl p-2.5 z-50">
                            <!-- Header -->
                            <div class="px-3 py-2 border-b border-white/5 mb-1.5 flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-black text-white tracking-tight">Modos de Contexto</p>
                                    <p class="text-[10px] text-zinc-500">Filtrar fluxo de tarefas</p>
                                </div>
                                <span id="mode-badge-total" class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-lime-400">Ativo</span>
                            </div>

                            <!-- List of Modes -->
                            <div id="modes-list-container" class="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                                <button type="button" data-mode-slug="todos" class="mode-item-btn w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold hover:bg-white/5 transition-all text-left group bg-white/10 text-white">
                                    <div class="flex items-center gap-2.5">
                                        <div class="flex items-center -space-x-1.5">
                                            <span class="w-5 h-5 rounded-full bg-purple-600/80 flex items-center justify-center text-[10px]">💼</span>
                                            <span class="w-5 h-5 rounded-full bg-orange-600/80 flex items-center justify-center text-[10px]">👤</span>
                                            <span class="w-5 h-5 rounded-full bg-cyan-600/80 flex items-center justify-center text-[10px]">🏢</span>
                                        </div>
                                        <div>
                                            <p class="font-bold text-xs text-white">Todos os Modos</p>
                                            <p class="text-[9px] text-zinc-500">Visão integrada geral</p>
                                        </div>
                                    </div>
                                    <span class="mode-check-indicator text-lime-400 font-black text-xs">✓</span>
                                </button>
                                <?php foreach (($modos ?? []) as $m): 
                                    $mCor = $m['cor'] ?? 'lime';
                                    $corBadgeMap = [
                                        'lime' => 'bg-lime-500/15 text-lime-400 border-lime-500/30',
                                        'purple' => 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                                        'orange' => 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                                        'cyan' => 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                                        'emerald' => 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                                        'rose' => 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                                    ];
                                    $corTextMap = [
                                        'lime' => 'text-lime-400',
                                        'purple' => 'text-purple-400',
                                        'orange' => 'text-orange-400',
                                        'cyan' => 'text-cyan-400',
                                        'emerald' => 'text-emerald-400',
                                        'rose' => 'text-rose-400',
                                    ];
                                    $mBadge = $corBadgeMap[$mCor] ?? $corBadgeMap['lime'];
                                    $mText = $corTextMap[$mCor] ?? $corTextMap['lime'];
                                ?>
                                    <div class="mode-item-row w-full flex items-center justify-between px-3 py-1.5 rounded-2xl text-xs font-semibold hover:bg-white/5 transition-all group">
                                        <button type="button" data-mode-slug="<?= htmlspecialchars($m['slug']) ?>" class="mode-select-btn flex items-center gap-2.5 flex-1 min-w-0 text-left py-0.5">
                                            <span class="w-7 h-7 rounded-xl <?= $mBadge ?> border flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0"><?= htmlspecialchars($m['icone']) ?></span>
                                            <div class="min-w-0 truncate">
                                                <p class="font-bold text-xs text-zinc-200 group-hover:text-white truncate"><?= htmlspecialchars($m['nome']) ?></p>
                                                <p class="text-[9px] text-zinc-500 truncate">Filtrar por <?= htmlspecialchars($m['nome']) ?></p>
                                            </div>
                                        </button>
                                        <div class="flex items-center gap-1 shrink-0">
                                            <span class="mode-check-indicator hidden <?= $mText ?> font-black text-xs mr-1">✓</span>
                                            <button type="button" class="btn-edit-mode text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" data-mode-id="<?= (int)$m['id'] ?>" title="Editar <?= htmlspecialchars($m['nome']) ?>">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>

                            <div class="h-px bg-white/5 my-1.5"></div>

                            <!-- Action: Adicionar Novo Modo -->
                            <button type="button" id="btn-open-create-mode" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-lime-400 hover:text-lime-300 hover:bg-lime-400/10 transition-all text-left">
                                <div class="w-6 h-6 rounded-lg bg-lime-400/20 text-lime-400 flex items-center justify-center text-xs font-black">
                                    +
                                </div>
                                <span>Adicionar Novo Modo</span>
                            </button>
                        </div>
                    </div>

                    <!-- Streak Pill Badge -->
                    <div class="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-extrabold">
                        🔥 <span class="user-streak-display"><?= $userStreak ?>d</span>
                    </div>

                    <!-- XP Pill -->
                    <div class="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-lime-400/15 border border-lime-400/30 text-lime-400 text-xs font-extrabold">
                        ⚡ <span class="user-xp-display"><?= $userXp ?> XP</span>
                    </div>
                </div>
            </div>

        <!-- SEÇÃO: INÍCIO (Home / Landing) -->
        <section id="section-inicio" class="app-section flex-1 p-4 md:p-8 space-y-5">
            <!-- Bento Summary Cards (Directly inspired by Image 1 & 2) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
                
                <!-- Card 1: Execução e Status Ativo -->
                <div class="glass-card rounded-3xl p-4 flex flex-col justify-between cursor-pointer group hover:border-white/20 transition-all" onclick="App.loadTaskView('kanban')">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center -space-x-1">
                            <span class="w-6 h-6 rounded-full bg-purple-500/80 flex items-center justify-center text-xs">☑️</span>
                            <span class="w-6 h-6 rounded-full bg-amber-500/80 flex items-center justify-center text-xs">⚡</span>
                            <span class="w-6 h-6 rounded-full bg-lime-500/80 flex items-center justify-center text-xs">🎯</span>
                        </div>
                        <span class="text-zinc-500 group-hover:text-white transition-colors">›</span>
                    </div>
                    <div>
                        <span class="text-[11px] text-zinc-400 font-medium">Ações em Andamento</span>
                        <div class="text-2xl font-black text-white tracking-tight mt-0.5" id="hero-active-count"><?= $totalActiveTasks ?> Tarefas</div>
                        <div class="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-lime-400"></span>
                            <span id="hero-concluded-today"><?= $concludedToday ?> concluídas hoje</span>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Foco e Distribuição (Segmented Colored Bars like Pierre) -->
                <div class="glass-card rounded-3xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div class="flex items-center justify-between mb-2">
                        <!-- 3 Segmented Pill Bars (Purple, Pink, Orange) -->
                        <div class="flex items-center gap-1.5">
                            <span class="w-8 h-2 rounded-full bg-purple-500"></span>
                            <span class="w-8 h-2 rounded-full bg-pink-500"></span>
                            <span class="w-8 h-2 rounded-full bg-orange-500"></span>
                        </div>
                        <span class="text-zinc-500 group-hover:text-white transition-colors">›</span>
                    </div>
                    <div>
                        <span class="text-[11px] text-zinc-400 font-medium">Eficiência Semanal</span>
                        <div class="text-2xl font-black text-white tracking-tight mt-0.5" id="hero-focus-rate"><?= $focusRate ?>% Foco</div>
                        <div class="text-[11px] text-zinc-400 mt-1">
                            3 categorias prioritárias
                        </div>
                    </div>
                </div>

                <!-- Card 3: Heatmap de Compromissos no Mês -->
                <div class="glass-card rounded-3xl p-4 flex flex-col justify-between md:col-span-2 lg:col-span-1 cursor-pointer group hover:border-white/20 transition-all" onclick="App.loadSection('tarefas'); App.loadTaskView('calendario')">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[11px] font-semibold text-zinc-400">Compromissos • <span id="heatmap-mes-nome"><?= htmlspecialchars($compMes['mes_nome'] ?? date('F')) ?></span></span>
                        <span class="text-[10px] font-bold <?= (($compMes['dias_com_agenda'] ?? 0) > 0) ? 'text-lime-400 bg-lime-400/10' : 'text-zinc-400 bg-white/5' ?> px-2 py-0.5 rounded-full" id="heatmap-badge-count">
                            <?= (($compMes['dias_com_agenda'] ?? 0) > 0) ? (($compMes['dias_com_agenda']) . ' dias marcados') : 'Ritmo Livre' ?>
                        </span>
                    </div>

                    <!-- Mini Heatmap Grid of Squares (Grey + Neon Lime) -->
                    <div class="flex items-center gap-1.5 py-1">
                        <div id="heatmap-cells-container" class="grid grid-flow-col grid-rows-3 gap-1.5">
                            <?php foreach (($compMes['dias'] ?? []) as $d): ?>
                                <?php
                                $cCount = (int)($d['count'] ?? 0);
                                $cIsToday = !empty($d['is_today']);
                                $cDia = $d['dia'];
                                $cTarefas = !empty($d['tarefas']) ? implode(', ', $d['tarefas']) : '';

                                $cTitle = "Dia " . str_pad((string)$cDia, 2, '0', STR_PAD_LEFT);
                                if ($cIsToday) $cTitle .= " (Hoje)";
                                if ($cCount === 0) {
                                    $cTitle .= ": Sem compromissos";
                                } elseif ($cCount === 1) {
                                    $cTitle .= ": 1 compromisso ({$cTarefas})";
                                } else {
                                    $cTitle .= ": {$cCount} compromissos ({$cTarefas})";
                                }

                                $cClasses = ['heat-cell'];
                                if ($cCount >= 4) {
                                    $cClasses[] = 'heat-cell-level-3';
                                } elseif ($cCount >= 2) {
                                    $cClasses[] = 'heat-cell-level-2';
                                } elseif ($cCount === 1) {
                                    $cClasses[] = 'heat-cell-level-1';
                                }
                                if ($cIsToday) {
                                    $cClasses[] = 'ring-1 ring-lime-400/80';
                                }
                                ?>
                                <div class="<?= implode(' ', $cClasses) ?>"
                                     data-date="<?= htmlspecialchars($d['data']) ?>"
                                     data-count="<?= $cCount ?>"
                                     title="<?= htmlspecialchars($cTitle) ?>"></div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <div class="text-[10px] text-zinc-500 flex justify-between items-center mt-1">
                        <span>Menos</span>
                        <div class="flex items-center gap-1.5" title="Escala: 1 fraco | 2-3 meio | 4+ forte">
                            <span class="w-2 h-2 rounded bg-zinc-800" title="0: Sem compromissos"></span>
                            <span class="w-2 h-2 rounded bg-lime-400/30 border border-lime-400/40" title="1 compromisso (Verde fraco)"></span>
                            <span class="w-2 h-2 rounded bg-[#84cc16]" title="2 a 3 compromissos (Verde meio)"></span>
                            <span class="w-2 h-2 rounded bg-[#bef264] shadow-sm shadow-lime-400/80" title="4+ compromissos (Verde forte)"></span>
                        </div>
                        <span>Mais</span>
                    </div>
                </div>
            </div>

            <!-- Instant Fast Capture Bar (Like "Pergunte ao Pierre" in Image 1) -->
            <div class="mt-4">
                <div class="glass-card rounded-2xl p-1.5 pl-4 pr-2 flex items-center justify-between gap-3 border border-white/10 hover:border-white/20 transition-all">
                    <input type="text" id="fast-capture-input" placeholder="Captura Rápida: O que você quer executar agora? (Pressione Enter)" class="bg-transparent flex-1 text-xs text-white placeholder-zinc-500 focus:outline-none">
                    <button type="button" id="btn-fast-capture-submit" class="px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs transition-all flex items-center gap-1 shadow-sm">
                        <span>+ Agendar</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- ========================================================
             SEÇÃO DINÂMICA: TAREFAS (Kanban, Lista, Calendário)
             ======================================================== -->
        <section id="section-tarefas" class="app-section flex-1 p-4 md:p-8 space-y-4 hidden">
            <!-- View Switcher Pills (Inspired by Pierre: Conexões | Cartão | Investimentos) -->
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="inline-flex p-1 bg-zinc-900/90 rounded-full border border-white/10 gap-1 shadow-lg">
                    <button type="button" data-task-view="kanban" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all glass-pill-active">
                        Kanban
                    </button>
                    <button type="button" data-task-view="lista" class="px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-all">
                        Lista Compacta
                    </button>
                    <button type="button" data-task-view="calendario" class="px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center gap-1">
                        <span>Calendário</span>
                        <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-lime-400 text-zinc-950 font-black">novo</span>
                    </button>
                </div>

                <!-- Priority & Search Filter Bar -->
                <div class="flex items-center gap-2">
                    <div class="relative w-44 sm:w-56">
                        <input type="text" id="search-task-input" placeholder="Buscar no Segundo Cérebro..." class="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400/80 transition-all">
                        <svg class="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    <select id="filter-priority-select" class="px-3 py-1.5 bg-zinc-900/80 border border-white/10 rounded-full text-xs text-zinc-300 focus:outline-none focus:border-lime-400/80 transition-all">
                        <option value="">Prioridades</option>
                        <option value="critica">🔴 Crítica</option>
                        <option value="alta">🟠 Alta</option>
                        <option value="media">🔵 Média</option>
                        <option value="baixa">⚪ Baixa</option>
                    </select>
                </div>
            </div>
            <div id="view-kanban-container"></div>
            <div id="view-lista-container" class="hidden"></div>
            <div id="view-calendario-container" class="hidden"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: MISSÕES ESTRATÉGICAS
             ======================================================== -->
        <section id="section-missoes" class="app-section flex-1 p-4 md:p-8 space-y-6 hidden">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-extrabold text-white">Missões Estratégicas</h3>
                    <p class="text-xs text-zinc-400">Alocação de energia em projetos de alto impacto.</p>
                </div>
                <button type="button" onclick="App.openMissionModal()" class="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5">
                    + Nova Missão
                </button>
            </div>

            <div id="missions-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: BASE DE CONHECIMENTO (Zettelkasten)
             ======================================================== -->
        <section id="section-notas" class="app-section flex-1 p-4 md:p-8 space-y-6 hidden">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-extrabold text-white">Notas</h3>
                    <p class="text-xs text-zinc-400">Ideias, atas e referências conectadas à execução.</p>
                </div>
                <button type="button" onclick="App.openNoteModal()" class="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5">
                    + Nova Nota
                </button>
            </div>

            <div id="notes-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: PRODUTIVIDADE & FOCO
             ======================================================== -->
        <section id="section-dashboard" class="app-section flex-1 p-4 md:p-8 space-y-6 hidden">
            <div>
                <h3 class="text-lg font-extrabold text-white">Produtividade & Gamificação</h3>
                <p class="text-xs text-zinc-400">Indicadores reais de velocidade e foco.</p>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="glass-card rounded-3xl p-5 space-y-1">
                    <span class="text-xs font-semibold text-zinc-400">Streak Consecutivo</span>
                    <p class="text-3xl font-black text-orange-400 flex items-center gap-1.5">
                        🔥 <span id="stat-streak-dash"><?= $userStreak ?>d</span>
                    </p>
                </div>
                <div class="glass-card rounded-3xl p-5 space-y-1">
                    <span class="text-xs font-semibold text-zinc-400">XP Acumulado</span>
                    <p class="text-3xl font-black text-lime-400 flex items-center gap-1.5">
                        ⚡ <span id="stat-xp-dash"><?= $userXp ?></span>
                    </p>
                </div>
                <div class="glass-card rounded-3xl p-5 space-y-1">
                    <span class="text-xs font-semibold text-zinc-400">Concluídas na Semana</span>
                    <p class="text-3xl font-black text-cyan-400" id="stat-concluidas"><?= $concludedWeek ?></p>
                </div>
                <div class="glass-card rounded-3xl p-5 space-y-1">
                    <span class="text-xs font-semibold text-zinc-400">Velocidade de Foco</span>
                    <p class="text-3xl font-black text-purple-400" id="stat-foco"><?= $focusRate ?>%</p>
                </div>
            </div>
        </section>

        <!-- ========================================================
             SEÇÃO: STARTUP - CLIENTES & CONTRATOS
             ======================================================== -->
        <section id="section-startup-clientes" class="app-section flex-1 p-4 md:p-8 space-y-5 hidden">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                        👥 Clientes & Contratos
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold uppercase tracking-wider">Energia Solar</span>
                    </h3>
                    <p class="text-xs text-zinc-400">Gestão de unidades consumidoras, propriedades e rateio de créditos.</p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="relative w-44 sm:w-56">
                        <input type="text" id="startup-clientes-busca" placeholder="Buscar por nome, UC ou CPF..." class="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400/80 transition-all">
                        <svg class="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <select id="startup-clientes-status-filter" class="px-3 py-1.5 bg-zinc-900/80 border border-white/10 rounded-full text-xs text-zinc-300 focus:outline-none focus:border-emerald-400/80">
                        <option value="">Status: Todos</option>
                        <option value="ativo">✅ Ativos</option>
                        <option value="suspenso">⏸️ Suspensos</option>
                        <option value="cancelado">❌ Cancelados</option>
                    </select>
                    <button type="button" onclick="StartupClientes.openModal()" class="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5 active:scale-95">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                        <span>Novo Cliente</span>
                    </button>
                </div>
            </div>

            <!-- Sub-abas: Clientes | Contratos -->
            <div class="flex items-center gap-2 border-b border-white/5 pb-2">
                <button type="button" id="tab-btn-clientes-lista" onclick="StartupClientes.switchSubTab('clientes')" class="px-3 py-1 rounded-full text-xs font-bold transition-all bg-white/10 text-white">
                    Lista de Clientes
                </button>
                <button type="button" id="tab-btn-clientes-contratos" onclick="StartupClientes.switchSubTab('contratos')" class="px-3 py-1 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all">
                    Gestão de Contratos
                </button>
            </div>

            <div id="startup-clientes-container" class="space-y-3 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: STARTUP - FATURAMENTO (EMISSOR + PAINEL)
             ======================================================== -->
        <section id="section-startup-faturamento" class="app-section flex-1 p-4 md:p-8 space-y-5 hidden">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                        🧾 Faturamento Solar
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 font-bold uppercase tracking-wider">Robô Emissor</span>
                    </h3>
                    <p class="text-xs text-zinc-400">Emissão automatizada a partir da conta Energisa e gestão de faturas.</p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <!-- Tab Pills: Emissão | Painel -->
                    <div class="inline-flex p-1 bg-zinc-900/90 rounded-full border border-white/10 gap-1 shadow-lg">
                        <button type="button" id="btn-tab-fatura-painel" onclick="StartupFaturamento.switchTab('painel')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all glass-pill-active">
                            Painel de Faturas
                        </button>
                        <button type="button" id="btn-tab-fatura-emissao" onclick="StartupFaturamento.switchTab('emissao')" class="px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center gap-1.5">
                            <span>🤖 Emissor (Robô)</span>
                        </button>
                    </div>
                    <button type="button" onclick="StartupFaturamento.switchTab('emissao')" class="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs rounded-full shadow-lg shadow-lime-400/10 transition-all flex items-center gap-1.5 active:scale-95">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                        <span>Emitir Fatura</span>
                    </button>
                </div>
            </div>

            <div id="startup-faturamento-container" class="space-y-4 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: STARTUP - ESTOQUE DE CRÉDITOS
             ======================================================== -->
        <section id="section-startup-creditos" class="app-section flex-1 p-4 md:p-8 space-y-5 hidden">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                        📊 Estoque de Créditos
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 font-bold uppercase tracking-wider">Supervisão</span>
                    </h3>
                    <p class="text-xs text-zinc-400">Controle de kWh gerados na usina, rateio e estimativa de duração por cliente.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="StartupCreditos.openModalNovoMes()" class="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5 active:scale-95">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                        <span>Registrar Mês de Produção</span>
                    </button>
                </div>
            </div>

            <div id="startup-creditos-container" class="space-y-4 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: STARTUP - FINANCEIRO (OPERACIONAL)
             ======================================================== -->
        <section id="section-startup-financeiro" class="app-section flex-1 p-4 md:p-8 space-y-5 hidden">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                        💰 Financeiro & Fluxo de Caixa
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/20 font-bold uppercase tracking-wider">Operacional</span>
                    </h3>
                    <p class="text-xs text-zinc-400">Entradas de faturas, custos de usina (manutenção, arrendamento) e controle de inadimplência.</p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="inline-flex p-1 bg-zinc-900/90 rounded-full border border-white/10 gap-1 shadow-lg">
                        <button type="button" id="btn-tab-fin-fluxo" onclick="StartupFinanceiro.switchTab('fluxo')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all glass-pill-active">
                            Movimentações
                        </button>
                        <button type="button" id="btn-tab-fin-inadimplencia" onclick="StartupFinanceiro.switchTab('inadimplencia')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center gap-1">
                            <span>Inadimplentes</span>
                            <span id="badge-inadimplentes-count" class="hidden text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-extrabold">0</span>
                        </button>
                    </div>
                    <button type="button" onclick="StartupFinanceiro.openModalMovimento()" class="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5 active:scale-95">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                        <span>Novo Movimento</span>
                    </button>
                </div>
            </div>

            <div id="startup-financeiro-container" class="space-y-4 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: STARTUP - DASHBOARD ANALÍTICO
             ======================================================== -->
        <section id="section-startup-dashboard" class="app-section flex-1 p-4 md:p-8 space-y-6 hidden">
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                        📈 Dashboard Solar
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold uppercase tracking-wider">Visão Executiva</span>
                    </h3>
                    <p class="text-xs text-zinc-400">Indicadores de rentabilidade, taxa de aproveitamento e evolução dos últimos 6 meses.</p>
                </div>
                <button type="button" onclick="StartupDashboard.load()" class="text-xs text-zinc-400 hover:text-white flex items-center gap-1 p-2 rounded-xl hover:bg-white/5 transition-all">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    <span>Atualizar Indicadores</span>
                </button>
            </div>

            <div id="startup-dashboard-container" class="space-y-5 pb-24 md:pb-8"></div>
        </section>

        <!-- ========================================================
             SEÇÃO: STARTUP - LOG DE AUDITORIA
             ======================================================== -->
        <section id="section-startup-auditoria" class="app-section flex-1 p-4 md:p-8 space-y-5 hidden">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 class="text-lg font-extrabold text-white flex items-center gap-2">
                        📋 Log de Auditoria
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-300 border border-white/10 font-bold uppercase tracking-wider">Rastreabilidade</span>
                    </h3>
                    <p class="text-xs text-zinc-400">Histórico de todas as operações realizadas em clientes, faturas, créditos e financeiro.</p>
                </div>
                <div class="flex items-center gap-2">
                    <select id="startup-auditoria-entidade" onchange="StartupAuditoria.load()" class="px-3 py-1.5 bg-zinc-900/80 border border-white/10 rounded-full text-xs text-zinc-300 focus:outline-none focus:border-white/40">
                        <option value="">Todas as Entidades</option>
                        <option value="cliente">👥 Clientes</option>
                        <option value="fatura">🧾 Faturas</option>
                        <option value="credito">📊 Créditos</option>
                        <option value="pagamento">💰 Pagamentos</option>
                    </select>
                </div>
            </div>

            <div id="startup-auditoria-container" class="space-y-2 pb-24 md:pb-8"></div>
        </section>
    </main>

    <!-- ========================================================
         FLOATING BOTTOM DOCK (Signature Pierre / iOS Capsule Dock)
         ======================================================== -->
    <div class="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92%]">
        <nav class="floating-dock rounded-full px-5 py-2.5 flex items-center justify-between safe-bottom">
            <!-- Tab 1: Início -->
            <button type="button" data-nav-section="inicio" class="flex flex-col items-center justify-center p-1 text-lime-400 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            </button>

            <!-- Tab 2: Tarefas -->
            <button type="button" data-nav-section="tarefas" class="flex flex-col items-center justify-center p-1 text-zinc-400 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </button>

            <!-- Central Floating (+) Action Button with Glow -->
            <button type="button" id="btn-quick-capture" class="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow-lg shadow-white/20 active:scale-95 transition-transform" title="Nova Tarefa">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
            </button>

            <!-- Tab 3: Notas -->
            <button type="button" data-nav-section="notas" class="flex flex-col items-center justify-center p-1 text-zinc-400 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </button>

            <!-- Tab 4: Métricas -->
            <button type="button" data-nav-section="dashboard" class="flex flex-col items-center justify-center p-1 text-zinc-400 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </button>
        </nav>
    </div>

    <!-- ========================================================
         MODAL / DRAWER LATERAL DE DETALHES (Dark Obsidian Sheet)
         ======================================================== -->
    <div id="task-modal-container" class="fixed inset-0 z-50 hidden">
        <div id="task-modal-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"></div>

        <div id="task-modal-drawer" class="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[500px] bg-[#0f0f13] border-t md:border-t-0 md:border-l border-white/10 rounded-t-[32px] md:rounded-none shadow-2xl flex flex-col max-h-[92vh] md:max-h-full transition-transform duration-250 drawer-enter">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-lime-400"></span>
                    <h3 id="modal-heading" class="font-extrabold text-sm md:text-base text-white">Editar Ação</h3>
                </div>
                <button type="button" id="btn-close-task-modal" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                    ✕
                </button>
            </div>

            <!-- Form Body -->
            <form id="task-form" class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                <input type="hidden" id="task-id">

                <!-- 1. Título & Missão -->
                <div class="space-y-3">
                    <div>
                        <label class="block font-bold text-zinc-400 mb-1.5">Título da Tarefa *</label>
                        <input type="text" id="task-title" required placeholder="O que você vai executar?" class="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-2xl text-sm font-semibold text-white placeholder-zinc-600 focus:outline-none focus:border-lime-400/80 transition-all">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block font-semibold text-zinc-400 mb-1.5">Modo de Contexto</label>
                            <select id="task-modo" class="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-white/10 rounded-2xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                                <?php foreach (($modos ?? []) as $m): ?>
                                    <option value="<?= htmlspecialchars($m['slug']) ?>"><?= htmlspecialchars($m['icone'] . ' ' . $m['nome']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-zinc-400 mb-1.5">Missão Mãe</label>
                            <select id="task-missao" class="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-white/10 rounded-2xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                                <option value="">(Sem Missão)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-zinc-400 mb-1.5">Prioridade</label>
                            <select id="task-prioridade" class="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-white/10 rounded-2xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                                <option value="critica">🔴 Crítica</option>
                                <option value="alta">🟠 Alta</option>
                                <option value="media" selected>🔵 Média</option>
                                <option value="baixa">⚪ Baixa</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-zinc-400 mb-1.5">Status</label>
                            <select id="task-status" class="w-full px-3.5 py-2.5 bg-zinc-900/80 border border-white/10 rounded-2xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                                <option value="planejamento" selected>Planejamento</option>
                                <option value="a_fazer">A Fazer</option>
                                <option value="fazendo">Fazendo</option>
                                <option value="feito">Feito</option>
                            </select>
                        </div>
                        <div class="flex items-center pt-5">
                            <label class="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" id="task-inbox" class="w-4 h-4 rounded text-lime-400 focus:ring-lime-400 bg-zinc-900 border-white/20">
                                <span class="text-zinc-300 font-medium">Caixa de Entrada</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- 2. Cronograma -->
                <div class="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
                    <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Cronograma de Execução
                    </span>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-zinc-500 mb-1">Início</label>
                            <input type="datetime-local" id="task-inicio" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                        </div>
                        <div>
                            <label class="block text-zinc-500 mb-1">Prazo Final</label>
                            <input type="datetime-local" id="task-entrega" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                        </div>
                    </div>
                </div>

                <!-- 3. Logística -->
                <div class="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
                    <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                        Logística & Deslocamento
                    </span>

                    <div>
                        <label class="block text-zinc-500 mb-1">Endereço ou Local</label>
                        <input type="text" id="task-endereco" placeholder="Ex: Av. Paulista, 1000" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                    </div>

                    <div class="flex items-center justify-between pt-1">
                        <label class="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" id="task-exige-veiculo" class="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-white/20">
                            <span class="font-medium text-zinc-300">Exige deslocamento com carro/veículo?</span>
                        </label>
                    </div>

                    <div id="veiculo-tempo-container" class="hidden pt-1">
                        <label class="block text-zinc-500 mb-1">Tempo de Viagem Estimado (minutos) *</label>
                        <input type="number" id="task-tempo-viagem" min="1" placeholder="Ex: 45" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                    </div>
                </div>

                <!-- 4. Alertas & Saída -->
                <div class="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
                    <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        Alertas & Notificação de Saída
                    </span>

                    <div>
                        <label class="block text-zinc-500 mb-1">Aviso Prévio (Antecedência)</label>
                        <select id="task-antecedencia" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                            <option value="0">Sem aviso prévio</option>
                            <option value="15">15 minutos antes</option>
                            <option value="30">30 minutos antes</option>
                            <option value="60">1 hora antes</option>
                            <option value="120">2 horas antes</option>
                            <option value="180">3 horas antes</option>
                            <option value="1440">1 dia antes</option>
                        </select>
                    </div>

                    <div id="alerta-calculado-info"></div>
                </div>

                <!-- 5. Subtarefas Checklist -->
                <div class="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                            Checklist de Subtarefas
                        </span>
                        <span id="checklist-progress-text" class="text-[11px] font-bold text-lime-400">0/0 (0%)</span>
                    </div>

                    <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div id="checklist-progress-bar" class="bg-lime-400 h-1.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>

                    <div id="checklist-items" class="space-y-1.5 max-h-48 overflow-y-auto"></div>

                    <div class="flex items-center gap-2 pt-1">
                        <input type="text" id="new-subtask-input" placeholder="Adicionar item... (Enter)" class="flex-1 px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80">
                        <button type="button" id="btn-add-subtask" title="Adicionar subtarefa" class="px-4 py-2 bg-white/10 hover:bg-white text-zinc-200 hover:text-black rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center">
                            +
                        </button>
                    </div>

                    <div class="pt-2">
                        <label class="block text-zinc-500 mb-1">Notas e Links da Tarefa (Markdown)</label>
                        <textarea id="task-descricao" rows="3" placeholder="Critérios de aceite, notas e links..." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-lime-400/80 resize-none font-mono text-[11px]"></textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div class="pt-3 flex items-center justify-between gap-3 sticky bottom-0 bg-[#0f0f13] py-3 border-t border-white/5">
                    <button type="button" id="btn-delete-task" class="px-3.5 py-2 text-red-400 hover:bg-red-500/10 rounded-full font-semibold transition-colors">
                        Excluir
                    </button>
                    <div class="flex items-center gap-2 ml-auto">
                        <button type="button" onclick="TaskModal.close()" class="px-4 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-all">
                            Cancelar
                        </button>
                        <button type="submit" id="btn-save-task" class="px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-extrabold shadow-lg transition-all">
                            Salvar Ação
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- ========================================================
         MODAL DE CONFLITO DE AGENDA (Anti-Colisão)
         ======================================================== -->
    <div id="conflict-modal" class="fixed inset-0 z-60 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="max-w-md w-full bg-[#121217] border border-orange-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-xl">
                ⚠️
            </div>

            <div>
                <h3 class="text-base font-extrabold text-white">Conflito de Agenda Detectado!</h3>
                <p class="text-xs text-zinc-400 mt-1">
                    O AIRES identificou uma sobreposição na sua janela produtiva.
                </p>
            </div>

            <div id="conflict-details"></div>

            <p class="text-xs text-zinc-300 font-medium">
                Deseja ajustar o horário ou manter a sobreposição consciente?
            </p>

            <div class="flex items-center justify-center gap-3 pt-2">
                <button type="button" id="conflict-btn-cancel" class="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-full transition-all">
                    Ajustar
                </button>
                <button type="button" id="conflict-btn-confirm" class="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                    Sobrepor
                </button>
            </div>
        </div>
    </div>

    <!-- ========================================================
         MODAL DE CONFIGURAÇÕES (Pierre Glassmorphism)
         ======================================================== -->
    <div id="settings-modal" class="fixed inset-0 z-60 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="max-w-lg w-full bg-[#121217] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative">
            <!-- Close button -->
            <button type="button" onclick="App.closeSettingsModal()" class="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <!-- Header -->
            <div class="flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-lime-400/20 to-emerald-500/20 text-lime-400 border border-lime-400/30 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div>
                    <h3 class="text-base font-extrabold text-white">Configurações & Preferências</h3>
                    <p class="text-xs text-zinc-400">Gerenciamento do Comandante e Sistema AIRES</p>
                </div>
            </div>

            <!-- Content Details -->
            <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                    <h4 class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Identidade do Administrador</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="text-zinc-500 block text-[11px] mb-1">Nome de Exibição</span>
                            <div class="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-medium">
                                <?= htmlspecialchars($_SESSION['usuario_nome'] ?? 'Administrador') ?>
                            </div>
                        </div>
                        <div>
                            <span class="text-zinc-500 block text-[11px] mb-1">E-mail Principal</span>
                            <div class="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-medium">
                                <?= htmlspecialchars($_SESSION['usuario_email'] ?? 'admin@aires.io') ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                    <h4 class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Preferências Operacionais</h4>
                    <div class="space-y-2.5">
                        <label class="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div class="text-xs">
                                <p class="font-bold text-zinc-200">Detector de Conflitos de Agenda</p>
                                <p class="text-[10px] text-zinc-500">Auditoria preventiva anti-colisão em tempo real</p>
                            </div>
                            <input type="checkbox" checked disabled class="w-4 h-4 rounded text-lime-400 bg-zinc-900 border-zinc-700">
                        </label>
                        <label class="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div class="text-xs">
                                <p class="font-bold text-zinc-200">Alertas de Deslocamento com Trânsito</p>
                                <p class="text-[10px] text-zinc-500">Cálculo de hora de saída baseado no tempo de viagem</p>
                            </div>
                            <input type="checkbox" checked disabled class="w-4 h-4 rounded text-lime-400 bg-zinc-900 border-zinc-700">
                        </label>
                    </div>
                </div>
            </div>

            <!-- Footer actions -->
            <div class="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button type="button" onclick="App.closeSettingsModal()" class="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-full transition-all">
                    Fechar
                </button>
            </div>
        </div>
    </div>

    <!-- ========================================================
         MODAL DE CRIAR NOVO MODO (Pierre Glassmorphism)
         ======================================================== -->
    <div id="modal-create-mode" class="fixed inset-0 z-60 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="max-w-md w-full bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <button type="button" id="btn-close-create-mode" class="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div class="flex items-center gap-3.5">
                <div id="modal-mode-icon-badge" class="w-11 h-11 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xl transition-all">
                    ✨
                </div>
                <div>
                    <h3 id="modal-mode-title" class="text-base font-extrabold text-white">Novo Modo de Contexto</h3>
                    <p id="modal-mode-desc" class="text-xs text-zinc-400">Separe fluxos de tarefas (Ex: Freelance, Família)</p>
                </div>
            </div>

            <form id="form-create-mode" class="space-y-4">
                <input type="hidden" id="new-mode-id" value="">
                <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Nome do Modo *</label>
                    <input type="text" id="new-mode-nome" required placeholder="Ex: Investimentos, Startup, Família..." class="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-400/80 text-xs">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Ícone (Emoji)</label>
                    <div class="flex items-center gap-2 mb-1.5">
                        <input type="text" id="new-mode-icone" maxlength="4" value="🎯" class="w-14 text-center py-2 bg-zinc-900 border border-white/10 rounded-2xl text-lg focus:outline-none focus:border-lime-400/80">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <?php foreach (['💼', '👤', '🏢', '🚀', '🎯', '💡', '🏠', '🎨', '📚', '⚡', '💰', '🛡️'] as $emo): ?>
                                <button type="button" class="mode-emoji-opt w-7 h-7 rounded-lg bg-white/5 hover:bg-white/20 text-xs flex items-center justify-center transition-transform hover:scale-110" data-emoji="<?= $emo ?>"><?= $emo ?></button>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Cor Temática</label>
                    <div class="flex items-center gap-2.5" id="new-mode-cor-picker">
                        <label class="cursor-pointer">
                            <input type="radio" name="new-mode-cor" value="lime" checked class="sr-only peer">
                            <span class="w-7 h-7 rounded-full bg-lime-400 border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-lime-400/50 block transition-all"></span>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="new-mode-cor" value="purple" class="sr-only peer">
                            <span class="w-7 h-7 rounded-full bg-purple-500 border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-purple-500/50 block transition-all"></span>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="new-mode-cor" value="orange" class="sr-only peer">
                            <span class="w-7 h-7 rounded-full bg-orange-500 border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-orange-500/50 block transition-all"></span>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="new-mode-cor" value="cyan" class="sr-only peer">
                            <span class="w-7 h-7 rounded-full bg-cyan-400 border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-cyan-400/50 block transition-all"></span>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="new-mode-cor" value="emerald" class="sr-only peer">
                            <span class="w-7 h-7 rounded-full bg-emerald-400 border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-emerald-400/50 block transition-all"></span>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="new-mode-cor" value="rose" class="sr-only peer">
                            <span class="w-7 h-7 rounded-full bg-rose-500 border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-rose-500/50 block transition-all"></span>
                        </label>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
                    <button type="button" id="btn-delete-mode" class="hidden px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs rounded-full transition-all mr-auto">
                        Excluir Modo
                    </button>
                    <button type="button" id="btn-cancel-create-mode" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-full transition-all">
                        Cancelar
                    </button>
                    <button type="submit" id="btn-submit-create-mode" class="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                        Salvar Modo
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Scripts -->
    <script src="assets/js/api.js"></script>
    <script src="assets/js/conflict-dialog.js"></script>
    <script src="assets/js/modal-task.js"></script>
    <script src="assets/js/kanban.js"></script>
    <script src="assets/js/list-view.js"></script>
    <script src="assets/js/calendar-view.js"></script>
    <script src="assets/js/startup-clientes.js"></script>
    <script src="assets/js/startup-faturamento.js"></script>
    <script src="assets/js/startup-creditos.js"></script>
    <script src="assets/js/startup-financeiro.js"></script>
    <script src="assets/js/startup-dashboard.js"></script>
    <script src="assets/js/startup-auditoria.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
