FROM php:8.3-cli-alpine

# Instala extensões PDO MySQL e dependências necessárias
RUN apk add --no-cache bash curl ca-certificates libpng-dev libjpeg-turbo-dev freetype-dev \
    && docker-php-ext-install pdo pdo_mysql

# Define o diretório de trabalho
WORKDIR /var/www/html

# Copia todos os arquivos da aplicação
COPY . /var/www/html/

# Garante pasta de uploads e permissões
RUN mkdir -p /var/www/html/public/uploads/faturas \
    && chmod -R 777 /var/www/html/public/uploads

# Torna o script de inicialização executável
RUN chmod +x /var/www/html/start.sh

# Porta padrão do Render
ENV PORT=10000
EXPOSE 10000

# Executa o Start Command
CMD ["/var/www/html/start.sh"]

