# Dockerized shibboleth service provider for SIGPwny authorization

How it works TL;DR:
- App is proxy-protected by shibboleth. 
- When they sign in, we store their uid and affiliation (student, alum, etc) in their session.
- We then redirect them to discord OAuth to get their discord account
- Discord bot changes their role based on their affiliation




# Changes to make for your own app (run your own service provider)
shibboleth2.xml:
- In the line `<ApplicationDefaults entityID=https://sp.example.org/shibboleth>`: Replace https://sp.example.org with your entity ID.
- In the line `<Errors supportContact=consult@illinois.edu>`:
Replace consult@illinois.edu with the appropriate support email address for services on this server.

attribute-map.xml:
- Uncomment your required attributes

Dockerfile:
- Change shib-keygen cmd to use your entityID instead
