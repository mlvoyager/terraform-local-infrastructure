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
