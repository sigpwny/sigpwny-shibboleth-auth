FROM debian:buster

# -- VARIOUS DEPENDENCIES --
RUN apt-get update
# saml2/shib stuff
RUN apt-get install -y opensaml2-schemas xmltooling-schemas libshibsp8 libshibsp-plugins shibboleth-sp2-common shibboleth-sp2-utils
# nginx stuff
RUN apt-get install -y build-essential libpcre3 libpcre3-dev libssl-dev zlib1g-dev
# etc stuff
RUN apt-get install -y wget curl git


# -- BUILD AND INSTALL NGINX W/ nginx-shib MODULE --
RUN echo "deb http://nginx.org/packages/debian/ buster nginx" >> /etc/apt/sources.list
RUN echo "deb-src http://nginx.org/packages/debian/ buster nginx" >> /etc/apt/sources.list

WORKDIR /tmp
RUN wget http://nginx.org/keys/nginx_signing.key
RUN apt-key add nginx_signing.key
RUN apt-get update

WORKDIR /opt
#RUN git clone https://github.com/openresty/headers-more-nginx-module.git
RUN git clone https://github.com/nginx-shib/nginx-http-shibboleth.git
RUN mkdir buildnginx && cd buildnginx
RUN cat /etc/apt/sources.list
RUN apt-get source nginx
RUN apt-get build-dep -y nginx
# add the shib module to the build file
#RUN sed -i 's/--with-ld-opt="\$\(LDFLAGS\)"/--with-ld-opt="\$\(LDFLAGS\)" --add-module=/opt/headers-more-nginx-module --add-module=/opt/nginx-http-shibboleth/g' nginx*/debian/rules
#RUN sed -i "s;--with-ld-opt=\"\$\(LDFLAGS\)\";--with-ld-opt=\"\$\(LDFLAGS\)\" --add-module=/opt/nginx-http-shibboleth;g" nginx*/debian/rules
WORKDIR /opt/nginx-1.16.1
RUN sed -i "s;--with-ld-opt=\"\$\(LDFLAGS\)\";--with-ld-opt=\"\$\(LDFLAGS\)\" --add-module=/opt/nginx-http-shibboleth;g" debian/rules
# build the package
RUN dpkg-buildpackage -b
# install it
WORKDIR /opt
RUN dpkg -i nginx_1.16.1-1~buster_amd64.deb



# -- INSTALL & CONFIGURE SUPERVISOR --
RUN apt-get install -y supervisor
COPY shibboleth.conf /etc/supervisor/conf.d/shibboleth.conf


# -- CONFIGURATION --
RUN shib-keygen -f
RUN cat /etc/shibboleth/sp-cert.pem /etc/shibboleth/sp-key.pem
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY attribute-map.xml /etc/shibboleth/attribute-map.xml
COPY shibboleth2.xml /etc/shibboleth/shibboleth2.xml

RUN ls /etc/supervisor

CMD ["/usr/bin/supervisord","--configuration=/etc/supervisor/supervisord.conf"]