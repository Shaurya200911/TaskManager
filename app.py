from flask import Flask, request, jsonify, redirect, url_for, render_template, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f'<User {self.id}>'

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    duedate = db.Column(db.Date, nullable=False)
    priority = db.Column(db.String, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f'<Task {self.id}>'

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        user = User(name=name, email=email, password=password)
        db.session.add(user)
        db.session.commit()

        return redirect(url_for('login'))
    else:
        return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email, password=password).first()
        if user:
            session['user_id'] = user.id
            return redirect(url_for('tasks'))
        else:
            return 'Invalid credentials. Please try again.'
    else:
        return render_template('login.html')

@app.route('/', methods=['GET'])
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
            'completed': False
        } for task in tasks
    ])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    new_task = Task(
        title=data['name'],
        duedate=datetime.strptime(data['dueDate'], '%Y-%m-%d').date(),
        priority=data['priority'],
        user_id=session['user_id']
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify({'message': 'Task added', 'id': new_task.id})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    task = Task.query.filter_by(id=task_id, user_id=session['user_id']).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'})

@app.route('/api/search')
def search_tasks():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    keyword = request.args.get('q', '').lower()
    tasks = Task.query.filter(
        Task.user_id == session['user_id'],
        Task.title.ilike(f'%{keyword}%')
    ).all()

    return jsonify([
        {
            'id': task.id,
            'name': task.title,
            'dueDate': task.duedate.strftime('%Y-%m-%d'),
            'priority': task.priority,
            'completed': False
        } for task in tasks
    ])

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/styles.css')
def styles():
    return send_from_directory('.', 'styles.css')

@app.route('/script.js')
def script():
    return send_from_directory('.', 'script.js')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", debug=True)
