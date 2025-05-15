from flask import Flask, request, jsonify, redirect, flash, url_for, render_template, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ✏️ Fill these with your actual email settings
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'skc112009@gmail.com'
app.config['MAIL_PASSWORD'] = 'qefl ranj fhsy mudo'

db = SQLAlchemy(app)
mail = Mail(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    duedate = db.Column(db.Date, nullable=False)
    priority = db.Column(db.String, nullable=False)
    label = db.Column(db.String(100), nullable=True)
    completed = db.Column(db.Boolean, default=False)
    recurring = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['username']
        email = request.form['email']
        password = request.form['password']

        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already registered. Please login.', 'warning')
            return redirect('/register')

        # Create new user
        new_user = User(name=name, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful! Please login.', 'success')
        return redirect('/login')

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email, password=password).first()
        if user:
            session['user_id'] = user.id
            return redirect(url_for('tasks'))
        else:
            error = 'Invalid credentials. Please try again OR register.'
            return render_template('login.html', error=error)
    return render_template('login.html', error=error)

@app.route('/')
def tasks():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    tasks = Task.query.filter_by(user_id=session['user_id']).all()
    return jsonify([
        {
            'id': task.id,
            'name': task.title,
            'dueDate': task.duedate.strftime('%Y-%m-%d'),
            'priority': task.priority,
            'completed': task.completed,
            'recurring': task.recurring,
            'label': task.label
        } for task in tasks
    ])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    task = Task(
        title=data['name'],
        duedate=datetime.strptime(data['dueDate'], '%Y-%m-%d').date(),
        priority=data['priority'],
        label=data.get('label', ''),
        recurring=data.get('recurring', False),
        user_id=session['user_id']
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': 'Task added', 'id': task.id})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    task = Task.query.filter_by(id=task_id, user_id=session['user_id']).first()
    if task:
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted'})
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task_completion(task_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    task = Task.query.filter_by(id=task_id, user_id=session['user_id']).first()
    if task:
        task.completed = not task.completed
        db.session.commit()
        return jsonify({'message': 'Toggled'})
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/tasks/<int:task_id>/move', methods=['PATCH'])
def move_task(task_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    new_due_date = data.get('dueDate')
    task = Task.query.filter_by(id=task_id, user_id=session['user_id']).first()
    if task:
        task.duedate = datetime.strptime(new_due_date, '%Y-%m-%d').date()
        db.session.commit()
        return jsonify({'message': 'Task moved'})
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/search')
def search_tasks():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    keyword = request.args.get('q', '').lower()
    tasks = Task.query.filter(
        Task.user_id == session['user_id'],
        (Task.title.ilike(f'%{keyword}%')) | (Task.label.ilike(f'%{keyword}%'))
    ).all()
    return jsonify([
        {
            'id': task.id,
            'name': task.title,
            'dueDate': task.duedate.strftime('%Y-%m-%d'),
            'priority': task.priority,
            'completed': task.completed,
            'recurring': task.recurring,
            'label': task.label
        } for task in tasks
    ])

@app.route('/send-email')
def send_email():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user = User.query.get(session['user_id'])
    tasks = Task.query.filter_by(user_id=user.id).all()

    current = [t for t in tasks if not t.completed]
    completed = [t for t in tasks if t.completed]

    body = f"""Hello {user.name},

Here is your task summary:

📌 Pending Tasks:
{chr(10).join(f"- {t.title} [{t.label}] (Due: {t.duedate})" for t in current)}

✅ Completed Tasks:
{chr(10).join(f"- {t.title} [{t.label}]" for t in completed)}

Regards,
Your Task Manager
"""

    msg = Message("Your Task Summary", sender=app.config['MAIL_USERNAME'], recipients=[user.email])
    msg.body = body
    mail.send(msg)

    return "Email sent!"

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/api/task-stats')
def task_stats():
    tasks = Task.query.all()
    stats = {}
    for task in tasks:
        date = str(task.duedate)  # Use due date or created date based on your model
        if date not in stats:
            stats[date] = {'completed': 0, 'pending': 0}
        if task.completed:
            stats[date]['completed'] += 1
        else:
            stats[date]['pending'] += 1
    return jsonify(stats)

@app.route('/styles.css')
def styles():
    return send_from_directory('.', 'styles.css')

@app.route('/script.js')
def script():
    return send_from_directory('.', 'script.js')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('.', 'service-worker.js')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", debug=True)
