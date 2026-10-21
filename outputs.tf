output "nginx_url" {
  description = "URL du serveur web "
  value       = "http://localhost:${var.nginx_port}"
}

output "docker_network" {
  value = docker_network.infrastructure.name
}

output "docker_volume" {
  value = docker_volume.data.name
}

output "postgres_container" {
  description = "Nom du conteneur PostgreSQL"
  value       = docker_container.postgres.name
}

output "postgres_database" {
  description = "nom de la base de donnees"
  value       = var.postgres_db
}