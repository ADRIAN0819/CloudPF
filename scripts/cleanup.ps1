# Script de limpieza para AWS Academy

param(
    [string]$StudentId = "student123",
    [string]$Region = "us-east-1"
)

Write-Host "🧹 Limpiando recursos de AWS Academy" -ForegroundColor Yellow
Write-Host "Student ID: $StudentId"
Write-Host "Region: $Region"

# Confirmar limpieza
$confirm = Read-Host "¿Estás seguro de que quieres eliminar todos los recursos? (escribe 'SI' para confirmar)"
if ($confirm -ne "SI") {
    Write-Host "❌ Limpieza cancelada" -ForegroundColor Red
    exit 0
}

# Eliminar stack de Serverless
Write-Host "🗑️  Eliminando funciones Lambda..."
try {
    npx serverless remove --stage academy --region $Region
    Write-Host "✅ Funciones Lambda eliminadas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error eliminando funciones Lambda" -ForegroundColor Yellow
}

# Eliminar tablas DynamoDB
Write-Host "🗑️  Eliminando tablas DynamoDB..."
try {
    aws dynamodb delete-table --table-name "Productos-academy" --region $Region
    aws dynamodb delete-table --table-name "Compras-academy" --region $Region
    Write-Host "✅ Tablas DynamoDB eliminadas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error eliminando tablas DynamoDB" -ForegroundColor Yellow
}

# Eliminar buckets S3
Write-Host "🗑️  Eliminando buckets S3..."
try {
    $accountId = (aws sts get-caller-identity | ConvertFrom-Json).Account
    $buckets = @(
        "cloudpf-data-academy-$accountId",
        "cloudpf-athena-results-academy"
    )
    
    foreach ($bucket in $buckets) {
        try {
            # Vaciar bucket primero
            aws s3 rm "s3://$bucket" --recursive --region $Region
            # Eliminar bucket
            aws s3api delete-bucket --bucket $bucket --region $Region
            Write-Host "✅ Bucket $bucket eliminado" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Error eliminando bucket $bucket" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  Error eliminando buckets S3" -ForegroundColor Yellow
}

# Eliminar base de datos Athena
Write-Host "🗑️  Eliminando base de datos Athena..."
try {
    $query = "DROP DATABASE IF EXISTS cloudpf_academy CASCADE"
    aws athena start-query-execution --query-string $query --result-configuration "OutputLocation=s3://cloudpf-athena-results-academy/" --region $Region
    Write-Host "✅ Base de datos Athena eliminada" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error eliminando base de datos Athena" -ForegroundColor Yellow
}

# Eliminar logs de CloudWatch
Write-Host "🗑️  Eliminando logs de CloudWatch..."
try {
    $logGroups = aws logs describe-log-groups --query "logGroups[?contains(logGroupName, 'cloudpf-ingesta-tiempo-real-academy')].logGroupName" --output text --region $Region
    if ($logGroups) {
        $logGroups -split "`t" | ForEach-Object {
            aws logs delete-log-group --log-group-name $_ --region $Region
        }
        Write-Host "✅ Logs de CloudWatch eliminados" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Error eliminando logs de CloudWatch" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Limpieza completada" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Verifica en la consola de AWS que todos los recursos fueron eliminados:" -ForegroundColor Cyan
Write-Host "  - Lambda Functions"
Write-Host "  - DynamoDB Tables"
Write-Host "  - S3 Buckets"
Write-Host "  - CloudWatch Logs"
Write-Host "  - Athena Databases"
Write-Host ""
Write-Host "💰 Esto ayuda a mantener los costos bajos en AWS Academy" -ForegroundColor Yellow
