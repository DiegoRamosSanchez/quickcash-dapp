# Primera etapa: Construcción (node:18-alpine)
FROM node:18-alpine AS build

WORKDIR /app

# Copiamos solo los archivos de dependencias primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalamos dependencias
RUN npm ci

# Copiamos el resto del código fuente
COPY . .

# Construimos la aplicación para producción
RUN npm run build -- --configuration production

# Segunda etapa: Imagen final con Nginx mínimo
FROM nginx:alpine-slim

# Eliminamos los archivos de configuración por defecto de nginx
RUN rm -rf /usr/share/nginx/html/* && \
    rm /etc/nginx/conf.d/default.conf

# Copiamos solo los archivos estáticos del navegador
COPY --from=build /app/dist/dapp/browser /usr/share/nginx/html

# Copiamos la configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/

# Exponemos el puerto 80
EXPOSE 80

# Ejecutamos nginx en modo foreground
CMD ["nginx", "-g", "daemon off;"]