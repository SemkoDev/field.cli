FROM node:8.9.4-alpine as builder
COPY . /usr/src/field

WORKDIR /usr/src/field
RUN npm install -g

EXPOSE 16600
EXPOSE 18600

CMD ["/usr/local/bin/field"]
ENTRYPOINT ["/usr/local/bin/field"]
