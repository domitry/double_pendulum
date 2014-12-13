require 'ode'
require 'nmatrix'
require 'securerandom'
require 'erb'

# Custom Widget for Simulator
class SimWidget < IRuby::Widget
  @@view_name = "SimView"
end

class Simulator
  def initialize(q0, dt=0.03, params={})
    {
      m1: 1.0,
      m2: 1.0,
      l1: 200,
      l2: 200
    }.merge(params).each do |key, val|
      self.define_singleton_method(key){val}
    end

    @t = 0
    @q = q0
    @dt = dt
    @n_buffer = 150
  end

  def integrand(t, q, f_args)
    g = 9.80665
    theta1, theta2 = q[0..1]
    d_theta1_dt, d_theta2_dt = q[2..3]

    m_mat = N[[(m1+m2)*l1*l1, m2*l1*l2*Math.cos(theta1-theta2)],
              [m2*l1*l2*Math.cos(theta1-theta2), m2*l2**2]]
    vec = N[[-m2*l1*l2*(d_theta2_dt**2)*Math.sin(theta1-theta2)-(m1+m2)*g*l1*Math.sin(theta1)],
            [m2*l1*l2*(d_theta1_dt**2)*Math.sin(theta1-theta2)-m2*g*l2*Math.sin(theta2)]]

    ddq_dtdt = m_mat.inverse.dot(vec)
    q[2..3].concat(ddq_dtdt.transpose.to_a)
  end

  def run_n(n)
    @r ||= Ode::Solver.new(method(:integrand)).init(@t, @q)
    ret = []
    n.times do |i|
      @t += @dt
      @r.integrate(@t)
      ret.push(@r.y[0..1])
    end
    ret
  end

  def get_msg(msg)
    n = msg["num"]
    arr = self.run_n(n)
    @wid.send({new_arr: arr})
  end

  def run
    @wid = SimWidget.new
    @wid.on_msg(method(:get_msg))
    @wid
  end

  def save_movie(n=500)
    arr = run_n(n)
    uuid = '"id-' + SecureRandom.uuid + '"'
    path = File.expand_path("../templates/movie.html.erb", __FILE__)
    content = ERB.new(File.read(path)).result(binding)
    IRuby.display content, mime: 'text/html'
  end
end

def register_widget
  path = File.expand_path("../templates/widget.js", __FILE__)
  IRuby.display File.read(path), mime: 'application/javascript'
end

def init_iruby
  path = File.expand_path("../templates/init.js", __FILE__)
  IRuby.display File.read(path), mime: 'application/javascript'
end

init_iruby
register_widget
