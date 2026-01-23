FROM node:24-alpine

WORKDIR /app

RUN npm init -y && npm install @univ-lehavre/atlas-redcap-service

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "node_modules/@univ-lehavre/atlas-redcap-service/dist/index.js"]
