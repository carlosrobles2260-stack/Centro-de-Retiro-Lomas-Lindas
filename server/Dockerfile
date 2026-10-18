# Imagen de producción del API del ERP Lomas Lindas
FROM node:22-bookworm-slim

WORKDIR /app

# Instalar solo dependencias de producción (aprovecha la caché de capas).
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el código fuente.
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]
