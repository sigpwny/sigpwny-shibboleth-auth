# Changes to make:

shibboleth2.xml:
- In the line `<ApplicationDefaults entityID=https://sp.example.org/shibboleth>`: Replace https://sp.example.org with your entity ID.
- In the line `<Errors supportContact=consult@illinois.edu>`:
Replace consult@illinois.edu with the appropriate support email address for services on this server.

attribute-map.xml:
- Uncomment your required attributes

Dockerfile:
- Change shib-keygen cmd to use your entityID instead