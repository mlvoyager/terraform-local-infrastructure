variable "nginx_port" {
  description = "Port local pour acceder au serveur nginx"
  type        = number
  default     = 8080
}

variable "postgres_db" {
  description = "nom de la base de donnees"
  type        = string
  default     = "appdb"
}
variable "postgres_user" {
  description = "utilisateur Postgres"
  type        = string
  default     = "appuser"
}

variable "postgres_password" {
  description = "Mot de passe PostgreSQL pour le laboratoire local"
  type        = string
  sensitive   = true
  default     = "mon-mot-de-passe"
}