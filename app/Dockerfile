FROM node:10
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY src/package*.json ./
USER node
RUN npm install
COPY --chown=node:node src/ ./
EXPOSE 8080
CMD [ "node", "index.js" ]