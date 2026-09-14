(function() {
  'use strict';

  var MODULE = 'ADMIN_USUARIOS';
  var PERMISSION = 'CAMBIAR_ESTADO';
  var installed = false;

  function canDeactivate() {
    try {
      return typeof hasActivePermission === 'function' &&
        hasActivePermission(MODULE, PERMISSION);
    } catch (e) {
      return false;
    }
  }

  function getUserId(button) {
    return String(button.getAttribute('data-edit-user') || '').trim();
  }

  function findUser(id) {
    if (typeof ADMIN_STATE !== 'undefined' && Array.isArray(ADMIN_STATE.users)) {
      return ADMIN_STATE.users.find(function(item) {
        return String(item.idUsuario) === String(id);
      }) || null;
    }
    return null;
  }

  function addButtons() {
    var region = document.getElementById('adminUsersContent');
    if (!region || !canDeactivate()) return;

    region.querySelectorAll('[data-edit-user]').forEach(function(editButton) {
      var id = getUserId(editButton);
      if (!id) return;
      var parent = editButton.parentElement;
      if (!parent) return;
      var exists = Array.prototype.some.call(
        parent.querySelectorAll('[data-deactivate-user]'),
        function(item) { return String(item.getAttribute('data-deactivate-user')) === id; }
      );
      if (exists) return;

      var button = document.createElement('button');
      button.className = 'table-button';
      button.type = 'button';
      button.setAttribute('data-deactivate-user', id);
      button.setAttribute('aria-label', 'Dar de baja usuario');
      button.setAttribute('title', 'Dar de baja usuario');
      button.innerHTML = '<span class="material-symbols-rounded">person_remove</span>';
      button.addEventListener('click', function() { deactivateUser(id, button); });
      parent.appendChild(button);
    });
  }

  function deactivateUser(id, button) {
    if (!canDeactivate()) {
      if (typeof toast === 'function') toast('Acceso denegado', 'No tienes el permiso para dar de baja usuarios.', true);
      return;
    }

    var user = findUser(id);
    var name = user ? (user.nombre || user.correo || id) : id;
    if (user && String(user.estado || '').toUpperCase() !== 'ACTIVO') {
      if (typeof toast === 'function') toast('Usuario ya inactivo', 'El usuario seleccionado ya está dado de baja.', true);
      return;
    }

    var accepted = window.confirm(
      '¿Dar de baja al usuario “' + name + '”?\n\n' +
      'Su acceso quedará INACTIVO y no podrá iniciar sesión hasta que un administrador lo reactive.'
    );
    if (!accepted) return;

    if (button) button.disabled = true;
    if (typeof setLoader === 'function') setLoader(true, 'Dando de baja usuario…');

    var request = typeof secureRpc === 'function'
      ? secureRpc('darDeBajaUsuarioAdminMotor', [{ idUsuario: id }], MODULE)
      : Promise.reject(new Error('El canal seguro de administración no está disponible.'));

    request.then(function() {
      if (typeof setLoader === 'function') setLoader(false);
      if (typeof toast === 'function') toast('Usuario dado de baja', 'El acceso fue desactivado correctamente.');
      if (typeof loadAdminUsers === 'function') return loadAdminUsers('', true);
      addButtons();
    }).catch(function(error) {
      if (typeof setLoader === 'function') setLoader(false);
      if (typeof toast === 'function') toast('No fue posible dar de baja', String(error && error.message || error || 'Error desconocido.'), true);
      if (button) button.disabled = false;
    });
  }

  function observe() {
    if (installed) return;
    installed = true;
    var observer = new MutationObserver(function() { addButtons(); });
    observer.observe(document.body, { childList: true, subtree: true });
    addButtons();
  }

  function start() {
    var attempts = 0;
    var timer = setInterval(function() {
      attempts += 1;
      if (document.body && typeof hasActivePermission === 'function') {
        clearInterval(timer);
        observe();
      } else if (attempts > 120) {
        clearInterval(timer);
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
