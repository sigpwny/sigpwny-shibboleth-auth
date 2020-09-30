FROM node:12
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
# install deps
RUN npm install -g @prisma/cli
COPY package*.json ./
USER node
COPY --chown=node:node prisma/ ./prisma/
RUN npm install
# copy src code
COPY --chown=node:node src/ ./src/
COPY --chown=node:node tsconfig.json ./
RUN npm run build
# run server
EXPOSE 8080
CMD [ "node", "dist/server.js" ]