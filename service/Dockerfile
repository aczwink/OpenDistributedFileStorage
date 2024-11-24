FROM node

WORKDIR /app
RUN apt update && apt install --no-install-recommends -y ffmpeg rclone && apt clean autoclean && apt autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/ && rm -rf /tmp/* /var/tmp/*

COPY ./dist/bundle.js ./
CMD [ "node", "bundle.js" ]