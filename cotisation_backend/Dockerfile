# syntax=docker/dockerfile:1

# node:22-slim, et surtout pas alpine.
#
# argon2 est un module natif. Sur alpine (musl), il n'existe pas toujours de
# binaire préconstruit : npm bascule alors sur une compilation qui exige
# python3, make et g++, et l'image double de taille pour un hachage de mot de
# passe qui marchait déjà. Debian slim a le binaire glibc, tout de suite.
FROM node:22-slim

WORKDIR /app

# openssl : Prisma en a besoin au chargement du moteur.
# tini    : sans lui, node est PID 1 et n'a aucune disposition par défaut pour
#           SIGTERM — le conteneur ignore l'arrêt et attend le SIGKILL, dix
#           secondes à chaque déploiement.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Jamais --omit=dev : la CLI prisma est en devDependencies, et c'est elle qui
# porte `prisma generate` juste en dessous comme `prisma migrate deploy` quand
# on l'exécute contre la base de production.
#
# NODE_ENV n'est posé qu'APRÈS cette ligne : défini avant, npm ignore les
# devDependencies tout seul et `prisma generate` échoue sur un binaire absent.
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

# L'URL factice ne sert qu'à charger prisma.config.ts, qui lit DATABASE_URL au
# démarrage — et il n'y a aucun .env dans l'image, .dockerignore l'exclut.
# `prisma generate` ne se connecte à rien : il lit le schéma et écrit le client
# dans node_modules/.prisma. La valeur n'est pas conservée dans l'image.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
# Aire de transit des documents avant leur envoi chez Cloudinary. Hors de /app
# pour que le conteneur reste lisible même si un fichier temporaire survit.
ENV UPLOAD_ROOT=/tmp/hiil-uploads

RUN mkdir -p /tmp/hiil-uploads && chown -R node:node /app /tmp/hiil-uploads
USER node

EXPOSE 4000

# Les migrations ne sont PAS appliquées au démarrage, volontairement : voir
# DEPLOIEMENT.md. Un conteneur qui migre à chaque redémarrage transforme un
# simple redéploiement en opération sur la base de production.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/server.js"]
