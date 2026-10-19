#!/bin/bash
set -e

echo "=== INICIANDO AIRES (RENDER) ==="

# Se as credenciais do banco estiverem configuradas, executa as migrações automáticas
if [ -n "$DB_HOST" ]; then
    echo "Executando migrações do banco de dados..."
    php database/migrate.php || echo "Aviso: migrate.php finalizou"
    php database/migration_modos.php || echo "Aviso: migration_modos.php finalizou"
    php database/migration_startup.php || echo "Aviso: migration_startup.php finalizou"
fi

# Define a porta injetada pelo Render ou padrão 10000
RENDER_PORT="${PORT:-10000}"

echo "Iniciando servidor PHP em 0.0.0.0:$RENDER_PORT..."
exec php -S 0.0.0.0:"$RENDER_PORT" -t public public/index.php
