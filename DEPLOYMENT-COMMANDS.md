# Comandos para ejecutar en tu MV de Ingesta

# 1. Actualizar sistema
sudo yum update -y

# 2. Instalar Node.js 18.x (si no lo tienes)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 3. Instalar Serverless Framework
sudo npm install -g serverless

# 4. Clonar el proyecto (si no lo has hecho)
git clone https://github.com/ADRIAN0819/CloudPF.git
cd CloudPF

# 5. Limpiar caché de npm y reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json

# 6. Instalar dependencias (ahora debería funcionar)
npm install

# 7. Configurar credenciales AWS Academy
aws configure
# Ingresa:
# - AWS Access Key ID: [tu_access_key_de_academy]
# - AWS Secret Access Key: [tu_secret_key_de_academy]
# - Default region name: us-east-1
# - Default output format: json

# 8. Configurar infraestructura (crear tabla SearchIndex y buckets S3)
npm run setup:infrastructure

# 9. Desplegar el servicio CDC
npm run deploy:dev

# 10. Verificar deployment
serverless info --stage dev

# 11. Ver funciones Lambda creadas
aws lambda list-functions --query 'Functions[?contains(FunctionName, `cloudpf-cdc`)]'

# 12. Probar el sistema CDC
npm run test:complete
