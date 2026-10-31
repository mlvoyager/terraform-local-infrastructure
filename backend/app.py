from datetime import date, datetime, timedelta, timezone
from functools import wraps
import os
import re
import time

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import URL, or_
from sqlalchemy.exc import OperationalError
from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()
app = Flask(__name__)
db_password = os.getenv("DB_PASSWORD", "")
app.config.update(
    SQLALCHEMY_DATABASE_URI=URL.create(
        "postgresql+psycopg",
        username=os.getenv("DB_USER", "appuser"),
        password=db_password,
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "appdb"),
        query={"client_encoding": os.getenv("DB_CLIENT_ENCODING", "UTF8")},
    ),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "taskflow-development-secret-change-before-deploying"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=8),
    JSON_SORT_KEYS=False,
)
CORS(app, resources={r"/*": {"origins": os.getenv("CORS_ORIGINS", "*").split(",")}})
db.init_app(app)
jwt = JWTManager(app)
COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


project_members = db.Table(
    "project_members",
    db.Column("project_id", db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), nullable=False, default="member")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": iso(self.created_at),
        }


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    color = db.Column(db.String(16), nullable=False, default="#7868e6")
    status = db.Column(db.String(24), nullable=False, default="active")
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    due_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    owner = db.relationship("User", foreign_keys=[owner_id])
    members = db.relationship("User", secondary=project_members, lazy="select")
    tasks = db.relationship("Task", back_populates="project", cascade="all, delete-orphan")

    def to_dict(self, include_members=True):
        total = len(self.tasks)
        done = sum(task.status == "done" for task in self.tasks)
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "status": self.status,
            "owner_id": self.owner_id,
            "owner": self.owner.to_dict(),
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": iso(self.created_at),
            "task_count": total,
            "completed_tasks": done,
            "progress": round(done * 100 / total) if total else 0,
            "member_count": len(self.members),
        }
        if include_members:
            data["members"] = [member.to_dict() for member in self.members]
        return data


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    status = db.Column(db.String(24), nullable=False, default="todo", index=True)
    priority = db.Column(db.String(24), nullable=False, default="medium", index=True)
    due_date = db.Column(db.Date, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    project = db.relationship("Project", back_populates="tasks")
    assignee = db.relationship("User", foreign_keys=[assignee_id])
    creator = db.relationship("User", foreign_keys=[creator_id])

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "is_overdue": bool(self.due_date and self.due_date < date.today() and self.status != "done"),
            "project_id": self.project_id,
            "project": {"id": self.project.id, "name": self.project.name, "color": self.project.color},
            "assignee_id": self.assignee_id,
            "assignee": self.assignee.to_dict() if self.assignee else None,
            "creator_id": self.creator_id,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    kind = db.Column(db.String(32), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    read_at = db.Column(db.DateTime(timezone=True))
    user = db.relationship("User")
    task = db.relationship("Task")

    def to_dict(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "message": self.message,
            "task_id": self.task_id,
            "task_title": self.task.title if self.task else None,
            "created_at": iso(self.created_at),
            "read_at": iso(self.read_at),
        }


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    jti = db.Column(db.String(36), primary_key=True)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


def iso(value):
    return value.isoformat() if value else None


def error(message, status=400):
    return jsonify({"error": message}), status


def payload():
    return request.get_json(silent=True) or {}


def parse_date(value, field_name="date"):
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError(f"Le champ {field_name} doit être une date AAAA-MM-JJ.")


def issue_token(user):
    return create_access_token(identity=str(user.id))


def roles_required(*roles):
    def decorator(view):
        @wraps(view)
        @jwt_required()
        def wrapped(*args, **kwargs):
            try:
                actor_id = int(get_jwt_identity())
            except (TypeError, ValueError):
                return error("Session invalide.", 401)
            actor = db.session.get(User, actor_id)
            if not actor or not actor.is_active:
                return error("Compte introuvable ou désactivé.", 401)
            if roles and actor.role not in roles:
                return error("Vous n'avez pas les droits nécessaires.", 403)
            g.current_user = actor
            return view(*args, **kwargs)

        return wrapped

    return decorator


def can_manage_project(actor, project):
    return actor.role == "admin" or (actor.role == "project_manager" and project.owner_id == actor.id)


def can_view_project(actor, project):
    if actor.role == "admin" or (actor.role == "project_manager" and project.owner_id == actor.id):
        return True
    return actor.role == "member" and any(member.id == actor.id for member in project.members)


def notify(user_id, kind, message, task_id):
    db.session.add(Notification(user_id=user_id, kind=kind, message=message, task_id=task_id))


def notify_due_tasks(user):
    today = date.today()
    tasks = Task.query.filter(
        Task.assignee_id == user.id,
        Task.status != "done",
        Task.due_date.isnot(None),
        Task.due_date <= today + timedelta(days=3),
    ).all()
    existing = {
        (item.task_id, item.kind)
        for item in Notification.query.filter_by(user_id=user.id).filter(
            Notification.kind.in_(["due_soon", "overdue"])
        ).all()
    }
    for task in tasks:
        kind = "overdue" if task.due_date < today else "due_soon"
        if (task.id, kind) not in existing:
            label = "en retard" if kind == "overdue" else "arrive bientôt à échéance"
            notify(user.id, kind, f"La tâche « {task.title} » {label}.", task.id)


@jwt.token_in_blocklist_loader
def token_is_revoked(_header, token):
    return db.session.get(RevokedToken, token["jti"]) is not None


@app.get("/")
def health():
    return jsonify({"message": "API Taskflow opérationnelle", "status": "ok"})


@app.post("/auth/register")
def register():
    data = payload()
    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    if len(full_name) < 2:
        return error("Le nom complet doit contenir au moins 2 caractères.")
    if "@" not in email or len(email) > 255:
        return error("Adresse e-mail invalide.")
    if not isinstance(password, str) or len(password) < 8:
        return error("Le mot de passe doit contenir au moins 8 caractères.")
    if User.query.filter_by(email=email).first():
        return error("Cette adresse e-mail est déjà utilisée.", 409)
    user = User(full_name=full_name, email=email, password_hash=generate_password_hash(password), role="member")
    db.session.add(user)
    db.session.commit()
    return jsonify({"access_token": issue_token(user), "user": user.to_dict()}), 201


@app.post("/auth/login")
def login():
    data = payload()
    user = User.query.filter_by(email=str(data.get("email", "")).strip().lower()).first()
    password = data.get("password", "")
    if not user or not user.is_active or not isinstance(password, str) or not check_password_hash(user.password_hash, password):
        return error("E-mail ou mot de passe incorrect.", 401)
    return jsonify({"access_token": issue_token(user), "user": user.to_dict()})


@app.get("/auth/me")
@roles_required()
def me():
    return jsonify({"user": g.current_user.to_dict()})


@app.post("/auth/logout")
@roles_required()
def logout():
    db.session.add(RevokedToken(jti=get_jwt()["jti"]))
    db.session.commit()
    return jsonify({"message": "Déconnexion réussie."})


@app.get("/users")
@roles_required("admin", "project_manager")
def list_users():
    query = User.query.order_by(User.full_name.asc())
    if g.current_user.role != "admin":
        query = query.filter(User.role != "admin", User.is_active.is_(True))
    return jsonify([user.to_dict() for user in query.all()])


@app.patch("/users/<int:user_id>")
@roles_required("admin")
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error("Utilisateur introuvable.", 404)
    data = payload()
    if "role" in data:
        if data["role"] not in ("admin", "project_manager", "member"):
            return error("Rôle invalide.")
        user.role = data["role"]
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return error("Le statut actif doit être un booléen.")
        if user.id == g.current_user.id and not data["is_active"]:
            return error("Vous ne pouvez pas désactiver votre propre compte.")
        user.is_active = bool(data["is_active"])
        if not user.is_active:
            project_ids = [
                row[0]
                for row in db.session.query(project_members.c.project_id).filter(
                    project_members.c.user_id == user.id
                ).all()
            ]
            if project_ids:
                db.session.execute(
                    project_members.delete().where(
                        project_members.c.user_id == user.id,
                        project_members.c.project_id.in_(project_ids),
                    )
                )
                Task.query.filter(Task.project_id.in_(project_ids), Task.assignee_id == user.id).update(
                    {Task.assignee_id: None}, synchronize_session=False
                )
    db.session.commit()
    return jsonify({"user": user.to_dict()})


@app.get("/projects")
@roles_required()
def list_projects():
    actor = g.current_user
    query = Project.query
    if actor.role == "project_manager":
        query = query.filter_by(owner_id=actor.id)
    elif actor.role == "member":
        query = query.filter(Project.members.any(User.id == actor.id))
    search = request.args.get("search", "").strip()
    status = request.args.get("status")
    member_id = request.args.get("member_id", type=int)
    if search:
        query = query.filter(or_(Project.name.ilike(f"%{search}%"), Project.description.ilike(f"%{search}%")))
    if status:
        query = query.filter(Project.status == status)
    if member_id:
        query = query.filter(Project.members.any(User.id == member_id))
    projects = query.order_by(Project.created_at.desc()).all()
    return jsonify([project.to_dict() for project in projects])


@app.post("/projects")
@roles_required("admin", "project_manager")
def create_project():
    data = payload()
    name = str(data.get("name", "")).strip()
    if not name:
        return error("Le nom du projet est obligatoire.")
    try:
        due_date = parse_date(data.get("due_date"), "due_date")
    except ValueError as exc:
        return error(str(exc))
    color = str(data.get("color", "#7868e6"))
    if not COLOR_PATTERN.fullmatch(color):
        return error("La couleur du projet doit être au format hexadécimal #RRGGBB.")

    member_ids = data.get("member_ids", [])
    if not isinstance(member_ids, list):
        return error("La liste des membres du projet est invalide.")
    members = [g.current_user]
    seen_member_ids = set()
    for member_id in member_ids:
        try:
            member_id = int(member_id)
        except (TypeError, ValueError):
            return error("Un membre sélectionné est invalide.")
        if member_id in seen_member_ids:
            continue
        seen_member_ids.add(member_id)
        if member_id == g.current_user.id:
            continue
        member = db.session.get(User, member_id)
        if not member or not member.is_active or member.role == "admin":
            return error("Un membre sélectionné est introuvable ou indisponible.")
        members.append(member)

    project = Project(
        name=name,
        description=str(data.get("description", "")).strip(),
        color=color,
        due_date=due_date,
        owner_id=g.current_user.id,
        members=members,
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({"project": project.to_dict()}), 201


@app.get("/projects/<int:project_id>")
@roles_required()
def get_project(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return error("Projet introuvable.", 404)
    if not can_view_project(g.current_user, project):
        return error("Accès au projet refusé.", 403)
    return jsonify({"project": project.to_dict()})


@app.patch("/projects/<int:project_id>")
@roles_required("admin", "project_manager")
def update_project(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return error("Projet introuvable.", 404)
    if not can_manage_project(g.current_user, project):
        return error("Seul le responsable du projet peut le modifier.", 403)
    data = payload()
    if "name" in data:
        name = str(data["name"]).strip()
        if not name:
            return error("Le nom du projet ne peut pas être vide.")
        project.name = name
    if "description" in data:
        project.description = str(data["description"]).strip()
    if "color" in data:
        color = str(data["color"])
        if not COLOR_PATTERN.fullmatch(color):
            return error("La couleur du projet doit être au format hexadécimal #RRGGBB.")
        project.color = color
    if "status" in data:
        if data["status"] not in ("active", "completed", "archived"):
            return error("Statut de projet invalide.")
        project.status = data["status"]
    if "due_date" in data:
        try:
            project.due_date = parse_date(data["due_date"], "due_date")
        except ValueError as exc:
            return error(str(exc))
    db.session.commit()
    return jsonify({"project": project.to_dict()})


@app.delete("/projects/<int:project_id>")
@roles_required("admin", "project_manager")
def delete_project(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return error("Projet introuvable.", 404)
    if not can_manage_project(g.current_user, project):
        return error("Seul le responsable du projet peut le supprimer.", 403)
    db.session.delete(project)
    db.session.commit()
    return jsonify({"message": "Projet supprimé."})


@app.post("/projects/<int:project_id>/members")
@roles_required("admin", "project_manager")
def add_project_member(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return error("Projet introuvable.", 404)
    if not can_manage_project(g.current_user, project):
        return error("Seul le responsable du projet peut gérer ses membres.", 403)
    member = db.session.get(User, payload().get("user_id"))
    if not member or not member.is_active or member.role == "admin":
        return error("Membre introuvable ou indisponible.", 404)
    if all(item.id != member.id for item in project.members):
        project.members.append(member)
        db.session.commit()
    return jsonify({"project": project.to_dict()})


@app.delete("/projects/<int:project_id>/members/<int:user_id>")
@roles_required("admin", "project_manager")
def remove_project_member(project_id, user_id):
    project = db.session.get(Project, project_id)
    if not project:
        return error("Projet introuvable.", 404)
    if not can_manage_project(g.current_user, project):
        return error("Seul le responsable du projet peut gérer ses membres.", 403)
    if project.owner_id == user_id:
        return error("Le responsable du projet ne peut pas être retiré.")
    project.members = [member for member in project.members if member.id != user_id]
    Task.query.filter_by(project_id=project.id, assignee_id=user_id).update(
        {Task.assignee_id: None}, synchronize_session=False
    )
    db.session.commit()
    return jsonify({"project": project.to_dict()})


@app.get("/tasks")
@roles_required()
def list_tasks():
    actor = g.current_user
    query = Task.query.join(Project)
    if actor.role == "project_manager":
        query = query.filter(Project.owner_id == actor.id)
    elif actor.role == "member":
        query = query.filter(Task.assignee_id == actor.id, Task.project.has(Project.members.any(User.id == actor.id)))
    project_id = request.args.get("project_id", type=int)
    assignee_id = request.args.get("assignee_id", type=int)
    status = request.args.get("status")
    priority = request.args.get("priority")
    due_before = request.args.get("due_before")
    due_after = request.args.get("due_after")
    search = request.args.get("search", "").strip()
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(or_(Task.title.ilike(f"%{search}%"), Task.description.ilike(f"%{search}%")))
    try:
        if due_before:
            query = query.filter(Task.due_date <= parse_date(due_before, "due_before"))
        if due_after:
            query = query.filter(Task.due_date >= parse_date(due_after, "due_after"))
    except ValueError as exc:
        return error(str(exc))
    tasks = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).limit(500).all()
    return jsonify([task.to_dict() for task in tasks])


def validate_assignee(project, assignee_id):
    if assignee_id in (None, ""):
        return None, None
    try:
        assignee_id = int(assignee_id)
    except (TypeError, ValueError):
        return None, "Utilisateur invalide."
    assignee = db.session.get(User, assignee_id)
    if not assignee or not assignee.is_active or assignee.role == "admin":
        return None, "La personne assignée doit être un employé actif."
    if all(member.id != assignee.id for member in project.members):
        project.members.append(assignee)
    return assignee, None


@app.post("/tasks")
@roles_required("admin", "project_manager")
def create_task():
    data = payload()
    title = str(data.get("title", "")).strip()
    project = db.session.get(Project, data.get("project_id"))
    if not title:
        return error("Le titre de la tâche est obligatoire.")
    if not project:
        return error("Projet introuvable.", 404)
    if not can_manage_project(g.current_user, project):
        return error("Vous ne pouvez pas créer de tâche dans ce projet.", 403)
    priority = data.get("priority", "medium")
    if priority not in ("low", "medium", "high", "urgent"):
        return error("Priorité invalide.")
    assignee, message = validate_assignee(project, data.get("assignee_id"))
    if message:
        return error(message)
    try:
        due_date = parse_date(data.get("due_date"), "due_date")
    except ValueError as exc:
        return error(str(exc))
    task = Task(
        title=title,
        description=str(data.get("description", "")).strip(),
        status="todo",
        priority=priority,
        due_date=due_date,
        project=project,
        assignee=assignee,
        creator=g.current_user,
    )
    db.session.add(task)
    db.session.flush()
    if assignee:
        notify(assignee.id, "task_assigned", f"La tâche « {task.title} » vous a été attribuée.", task.id)
    db.session.commit()
    return jsonify({"task": task.to_dict()}), 201


@app.patch("/tasks/<int:task_id>")
@roles_required()
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return error("Tâche introuvable.", 404)
    data = payload()
    actor = g.current_user
    manager = can_manage_project(actor, task.project)
    if not manager:
        if actor.role != "member" or task.assignee_id != actor.id or not any(member.id == actor.id for member in task.project.members):
            return error("Vous ne pouvez modifier que le statut de vos tâches.", 403)
        if any(key != "status" for key in data):
            return error("Un membre peut uniquement mettre à jour le statut de sa tâche.", 403)
    if "status" in data:
        if data["status"] not in ("todo", "in_progress", "review", "done"):
            return error("Statut de tâche invalide.")
        task.status = data["status"]
    if manager:
        if "title" in data:
            title = str(data["title"]).strip()
            if not title:
                return error("Le titre de la tâche ne peut pas être vide.")
            task.title = title
        if "description" in data:
            task.description = str(data["description"]).strip()
        if "priority" in data:
            if data["priority"] not in ("low", "medium", "high", "urgent"):
                return error("Priorité invalide.")
            task.priority = data["priority"]
        if "due_date" in data:
            try:
                task.due_date = parse_date(data["due_date"], "due_date")
            except ValueError as exc:
                return error(str(exc))
        if "assignee_id" in data:
            previous_assignee_id = task.assignee_id
            assignee, message = validate_assignee(task.project, data["assignee_id"])
            if message:
                return error(message)
            task.assignee = assignee
            if assignee and assignee.id != previous_assignee_id:
                notify(assignee.id, "task_assigned", f"La tâche « {task.title} » vous a été attribuée.", task.id)
    db.session.commit()
    return jsonify({"task": task.to_dict()})


@app.delete("/tasks/<int:task_id>")
@roles_required("admin", "project_manager")
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return error("Tâche introuvable.", 404)
    if not can_manage_project(g.current_user, task.project):
        return error("Vous ne pouvez pas supprimer cette tâche.", 403)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Tâche supprimée."})


@app.get("/notifications")
@roles_required()
def list_notifications():
    notify_due_tasks(g.current_user)
    db.session.commit()
    items = Notification.query.filter_by(user_id=g.current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify({"items": [item.to_dict() for item in items], "unread_count": sum(item.read_at is None for item in items)})


@app.patch("/notifications/read-all")
@roles_required()
def read_all_notifications():
    Notification.query.filter_by(user_id=g.current_user.id, read_at=None).update(
        {Notification.read_at: datetime.now(timezone.utc)}, synchronize_session=False
    )
    db.session.commit()
    return jsonify({"message": "Notifications marquées comme lues."})


@app.patch("/notifications/<int:notification_id>/read")
@roles_required()
def read_notification(notification_id):
    item = db.session.get(Notification, notification_id)
    if not item or item.user_id != g.current_user.id:
        return error("Notification introuvable.", 404)
    if not item.read_at:
        item.read_at = datetime.now(timezone.utc)
        db.session.commit()
    return jsonify({"notification": item.to_dict()})


@app.get("/dashboard")
@roles_required()
def dashboard():
    actor = g.current_user
    projects_query = Project.query
    tasks_query = Task.query.join(Project)
    if actor.role == "project_manager":
        projects_query = projects_query.filter(Project.owner_id == actor.id)
        tasks_query = tasks_query.filter(Project.owner_id == actor.id)
    elif actor.role == "member":
        projects_query = projects_query.filter(Project.members.any(User.id == actor.id))
        tasks_query = tasks_query.filter(Task.assignee_id == actor.id, Task.project.has(Project.members.any(User.id == actor.id)))
    projects = projects_query.all()
    tasks = tasks_query.all()
    today = date.today()
    active_projects = sum(project.status == "active" for project in projects)
    overdue_tasks = sum(task.due_date and task.due_date < today and task.status != "done" for task in tasks)
    status_counts = {status: sum(task.status == status for task in tasks) for status in ("todo", "in_progress", "review", "done")}
    priority_counts = {priority: sum(task.priority == priority for task in tasks) for priority in ("low", "medium", "high", "urgent")}
    return jsonify({
        "projects": {"total": len(projects), "active": active_projects},
        "tasks": {
            "total": len(tasks),
            "completed": status_counts["done"],
            "in_progress": status_counts["in_progress"],
            "overdue": overdue_tasks,
            "by_status": status_counts,
            "by_priority": priority_counts,
        },
        "recent_tasks": [task.to_dict() for task in sorted(tasks, key=lambda item: item.updated_at or item.created_at, reverse=True)[:6]],
        "projects_list": [project.to_dict(include_members=False) for project in sorted(projects, key=lambda item: item.created_at, reverse=True)[:5]],
    })


@app.errorhandler(404)
def not_found(_exception):
    return error("Ressource introuvable.", 404)


@app.errorhandler(405)
def method_not_allowed(_exception):
    return error("Méthode non autorisée.", 405)


@app.errorhandler(OperationalError)
def database_unavailable(exception):
    db.session.rollback()
    if not os.getenv("DB_PASSWORD"):
        message = "DB_PASSWORD est absent. Définissez le mot de passe PostgreSQL puis redémarrez Flask."
    else:
        message = "Connexion PostgreSQL impossible. Vérifiez DB_HOST, DB_PORT, DB_NAME, DB_USER et DB_PASSWORD."
    app.logger.error("Échec d’une opération PostgreSQL : %s", getattr(exception, "orig", exception))
    return error(message, 503)


def initialize_database():
    attempts = int(os.getenv("DB_CONNECT_ATTEMPTS", "30"))
    for attempt in range(attempts):
        try:
            db.create_all()
            admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
            admin_password = os.getenv("ADMIN_PASSWORD", "")
            if admin_email and admin_password:
                admin = User.query.filter_by(email=admin_email).first()
                if not admin:
                    admin = User(
                        full_name=os.getenv("ADMIN_NAME", "Administrateur"),
                        email=admin_email,
                        password_hash=generate_password_hash(admin_password),
                        role="admin",
                    )
                    db.session.add(admin)
                else:
                    admin.role = "admin"
                    admin.is_active = True
                db.session.commit()
            return
        except Exception:
            db.session.rollback()
            if attempt == attempts - 1:
                app.logger.exception("Connexion PostgreSQL impossible après %s tentatives.", attempts)
                return
            time.sleep(2)


with app.app_context():
    initialize_database()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))