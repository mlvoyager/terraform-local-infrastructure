resource "docker_network" "infrastructure" {
  name   = "terraform_network"
  driver = "bridge"
}
resource "docker_volume" "data" {
  name = "terraform-data"
}

resource "docker_image" "frontend-react" {
  name = "terraform-fronted:latest"
  build {
    context    = "${path.module}/frontend-react"
    dockerfile = "Dockerfile"
  }
}

resource "docker_image" "nginx" {
  name         = "nginx:alpine"
  keep_locally = true
}

resource "docker_container" "nginx" {
  name  = "terraform-nginx"
  image = docker_image.frontend-react.image_id

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
    volume_name    = docker_volume.data.name
    container_path = "/var/lib/postgresql/data"
  }
  restart = "unless-stopped"


}



resource "docker_image" "backend" {
  name = "taskflow-backend:1.0"
  build {
    context = "${path.module}/backend" # ici on va construire l'image a partir du dockerfile
  }

  keep_locally = true
}

resource "docker_container" "backend" {
  name  = "terraform-backend"
  image = docker_image.backend.image_id

  ports {
    internal = 5000
    external = 5000
  }
  env = [
    "DB_HOST=terraform-postgres",
    "DB_NAME=${var.postgres_db}",
    "DB_USER=${var.postgres_user}",
    "DB_PASSWORD=${var.postgres_password}"
  ]

  networks_advanced {
    name = docker_network.infrastructure.name
  }

  depends_on = [docker_container.postgres]

  restart = "unless-stopped"
}