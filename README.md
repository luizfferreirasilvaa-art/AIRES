# AIRES — Execution Engine & Segundo Cérebro (v1.0.0)

Sistema desenvolvido rigorosamente com base nas diretrizes arquiteturais, regras de negócio e especificações funcionais definidas em [`PROJETO AIRES.md`](file:///c:/laragon/www/AIRES/PROJETO%20AIRES.md).

---

## 🚀 Como Executar

### Opção 1: Servidor Local Rápido (Recomendado)
Dê um duplo clique no arquivo [`iniciar_servidor.bat`](file:///c:/laragon/www/AIRES/iniciar_servidor.bat) ou rode no PowerShell:
```powershell
& "C:\laragon\bin\php\php-8.4.21-Win32-vs17-x64\php.exe" -S 0.0.0.0:8088 -t public public/index.php
```
Acesse no seu navegador:
👉 **[http://localhost:8088](http://localhost:8088)**

### Opção 2: Pelo Apache do Laragon
Inicie o Apache e MySQL no Laragon e acesse:
👉 **[http://localhost/AIRES/public/](http://localhost/AIRES/public/)** ou **[http://aires.test](http://aires.test)**
