# Comandos para ejecutar en tu MV de Ingesta

# 1. Actualizar sistema
sudo yum update -y

# 2. Instalar Node.js 18.x (si no lo tienes)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 3. Instalar Serverless Framework
sudo npm install -g serverless

# 4. Clonar el proyecto
git clone https://github.com/ADRIAN0819/CloudPF.git
cd CloudPF

# 5. Instalar dependencias
npm install

# 6. Configurar credenciales AWS Academy
aws configure
# Ingresa:
# - AWS Access Key ID: [tu_access_key_de_academy]
# - AWS Secret Access Key: [tu_secret_key_de_academy]
# - Default region name: us-east-1
# - Default output format: json

# 7. Desplegar el servicio
serverless deploy --stage dev

# 8. Verificar deployment
serverless info --stage dev

# 9. Listar las funciones Lambda creadas
aws lambda list-functions --query 'Functions[?contains(FunctionName, `cloudpf-cdc`)]'
