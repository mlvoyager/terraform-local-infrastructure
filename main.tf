resource "docker_network" "infrastructure" {
  name   = "terraform_network"
  driver = "bridge"
}
resource "docker_volume" "data" {
  name = "terraform-data"
}


resource "docker_image" "nginx" {
  name         = "nginx:alpine"
  keep_locally = true
}

resource "docker_container" "nginx" {
  name  = "terraform-nginx"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = var.nginx_port
  }

  networks_advanced {
    name = docker_network.infrastructure.name
  }
}


resource "docker_image" "posgress" {
  name         = "postgres:16-alpine"
  keep_locally = true
}

resource "docker_container" "postgres" {
  name  = "terraform-postgres"
  image = docker_image.posgress.image_id
  env = [
    "POSTGRES_DB=${var.postgres_db}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}"
  ]
  networks_advanced {
    name = docker_network.infrastructure.name
  }
  volumes {
    volume_name           = docker_volume.data.name
    container_path = "/var/lib/postgresql/data"
  }
  restart = "unless-stopped"


}