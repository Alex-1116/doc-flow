FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --timeout=120000

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
