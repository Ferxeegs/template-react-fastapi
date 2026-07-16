FROM nginx:alpine

# Hapus config bawaan
RUN rm /etc/nginx/conf.d/default.conf

# Copy config local
COPY ./builder/local/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]