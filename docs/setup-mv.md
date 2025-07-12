# Configuración para Máquina Virtual AWS Academy

## Pre-requisitos en la MV

### 1. Instalar Node.js 18+
```bash
# Actualizar sistema
sudo yum update -y

# Instalar Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 2. Instalar AWS CLI v2
```bash
# Descargar e instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verificar instalación
aws --version
```

### 3. Instalar Git
```bash
sudo yum install -y git
git --version
```

### 4. Instalar Docker (para ElasticSearch local)
```bash
# Instalar Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación (requiere logout/login)
docker --version
docker-compose --version
```

## Configuración del Proyecto

### 1. Clonar el repositorio
```bash
# Crear directorio de trabajo
mkdir ~/cloudpf-workspace
cd ~/cloudpf-workspace

# Clonar el proyecto
git clone https://github.com/TU-USUARIO/CloudPF.git
cd CloudPF
```

### 2. Configurar credenciales de AWS Academy
```bash
# Obtener credenciales del Lab de AWS Academy
# Copiar de "AWS Details" -> "AWS CLI"

# Configurar AWS CLI
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set aws_session_token YOUR_SESSION_TOKEN
aws configure set region us-east-1
aws configure set output json

# Verificar configuración
aws sts get-caller-identity
```

### 3. Configurar variables de entorno
```bash
# Copiar archivo de configuración
cp .env.example .env

# Editar configuración
nano .env

# Configurar variables específicas para Academy
export STAGE=academy
export AWS_REGION=us-east-1
export STUDENT_ID=tu-student-id
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### 4. Instalar dependencias
```bash
# Instalar dependencias del proyecto
npm install

# Instalar Serverless Framework globalmente
npm install -g serverless

# Verificar instalación
serverless --version
```

## Configuración específica para MV Academy

### 1. Configurar ElasticSearch local
```bash
# Iniciar ElasticSearch con Docker
chmod +x scripts/start-elasticsearch-mv.sh
./scripts/start-elasticsearch-mv.sh

# Verificar que ElasticSearch esté funcionando
curl -X GET "localhost:9200/_cluster/health?pretty"
```

### 2. Configurar índices de búsqueda
```bash
# Configurar índices locales
STAGE=academy TENANT_IDS=tenant1,tenant2,tenant3 node scripts/setup-elasticsearch.js

# Verificar índices
curl -X GET "localhost:9200/_cat/indices?v"
```

### 3. Desplegar funciones Lambda
```bash
# Desplegar usando configuración de Academy
serverless deploy --config serverless-academy.yml --stage academy

# Verificar deployment
serverless info --config serverless-academy.yml --stage academy
```

## Solución de Problemas en MV

### 1. Problemas de memoria
```bash
# Aumentar memoria disponible para Node.js
export NODE_OPTIONS="--max-old-space-size=2048"

# Verificar memoria del sistema
free -h
```

### 2. Problemas de permisos Docker
```bash
# Añadir usuario al grupo docker
sudo usermod -a -G docker $USER

# Logout y login para aplicar cambios
exit
# Volver a conectar por SSH
```

### 3. Problemas de red
```bash
# Verificar conectividad
ping aws.amazon.com
nslookup aws.amazon.com

# Verificar security groups (desde consola AWS)
```

### 4. Credenciales expiradas
```bash
# Las credenciales de Academy expiran cada 4 horas
# Renovar desde el Lab de AWS Academy
aws configure set aws_access_key_id NEW_ACCESS_KEY
aws configure set aws_secret_access_key NEW_SECRET_KEY
aws configure set aws_session_token NEW_SESSION_TOKEN
```

## Monitoreo desde la MV

### 1. Ver logs de Lambda
```bash
# Seguir logs en tiempo real
serverless logs -f productStreamProcessor --config serverless-academy.yml --stage academy --tail

# Ver logs específicos
aws logs get-log-events --log-group-name /aws/lambda/cloudpf-ingesta-tiempo-real-academy-productStreamProcessor
```

### 2. Verificar recursos
```bash
# Listar funciones Lambda
aws lambda list-functions --query 'Functions[?contains(FunctionName, `cloudpf-ingesta`)].FunctionName'

# Verificar tablas DynamoDB
aws dynamodb list-tables --query 'TableNames[?contains(@, `academy`)]'

# Verificar buckets S3
aws s3 ls | grep cloudpf
```

## Limpieza desde la MV

### 1. Limpiar recursos AWS
```bash
# Ejecutar script de limpieza
./scripts/cleanup-academy.sh

# O manualmente
serverless remove --config serverless-academy.yml --stage academy
```

### 2. Limpiar contenedores Docker
```bash
# Parar y eliminar contenedores
docker-compose -f docker/docker-compose.yml down -v

# Limpiar imágenes
docker system prune -a
```

## Notas Importantes para MV Academy

1. **Recursos limitados**: La MV tiene CPU y memoria limitada
2. **Sesiones temporales**: Las credenciales expiran cada 4 horas
3. **Almacenamiento**: Usar volúmenes persistentes para datos importantes
4. **Red**: Verificar security groups para acceso a servicios
5. **Costos**: Monitorear uso para no exceder límites del lab

## Comandos útiles para MV

```bash
# Monitor de recursos
htop

# Espacio en disco
df -h

# Procesos de Node.js
ps aux | grep node

# Procesos de Docker
docker ps

# Logs del sistema
sudo journalctl -f
```
