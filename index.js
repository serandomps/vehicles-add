var dust = require('dust')();
var serand = require('serand');
var autils = require('autos-utils');
var utils = require('utils');
var form = require('form');
var locate = require('locate');
var Vehicle = require('vehicles-service');
var Binaries = require('service-binaries');
var Make = require('vehicle-makes-service');
var Model = require('vehicle-models-service');

dust.loadSource(dust.compile(require('./preview'), 'vehicles-create-preview'));
dust.loadSource(dust.compile(require('./template'), 'vehicles-create'));

var BINARY_API = utils.resolve('accounts:///apis/v/binaries');
var AUTO_API = utils.resolve('autos:///apis/v/vehicles');

var configs = {
    type: {
        find: function (context, source, done) {
            done(null, form.select(source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the type of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.type', vform.elem);
            form.selectize(form.select(el, null, value || ''));
            done();
        }
    },
    contacts: {
        find: function (context, source, done) {
            done(null, {
                email: 'user@serandives.com'
            });
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    manufacturedAt: {
        find: function (context, source, done) {
            done(null, form.select(source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the year of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.manufacturedAt', vform.elem);
            value = value ? moment(value).year() : '';
            form.selectize(form.select(el, null, value));
            done();
        }
    },
    location: {
        find: function (context, source, done) {
            context.eventer.emit('find', done);
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the location of your vehicle');
            }
            context.eventer.emit('validate', value, done);
        },
        update: function (context, source, error, value, done) {
            context.eventer.emit('update', error, value, done);
        },
        render: function (ctx, vform, data, value, done) {
            var options = _.isString(value) ? {user: data.user, location: value} : value;
            locate({}, $('.location', vform.elem), options, function (err, eventer) {
                if (err) {
                    return done(err);
                }
                eventer.on('change', function (location, done) {
                    var button = $('.next', vform.elem);
                    if (location === '+') {
                        step(vform.elem, button, 'location', 'Next');
                        return done();
                    }
                    step(vform.elem, button, 'vehicle', 'Add');
                    done();
                });
                done(null, {eventer: eventer});
            });
        },
        create: function (context, value, done) {
            context.eventer.emit('create', value, function (err, errors, location) {
                done(err, errors, location);
            });
        }
    },
    doors: {
        find: function (context, source, done) {
            done(null, 5);
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    seats: {
        find: function (context, source, done) {
            done(null, 5);
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    engine: {
        find: function (context, source, done) {
            done(null, 1500);
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    driveType: {
        find: function (context, source, done) {
            done(null, 'front');
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    steering: {
        find: function (context, source, done) {
            done(null, 'right');
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    make: {
        find: function (context, source, done) {
            done(null, form.select(source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the make of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.make', vform.elem);
            value = value ? value.id : '';
            form.selectize(form.select(el, null, value)).on('change', function (make) {
                updateModels(vform.contexts.model, vform.elem, {id: make}, null, function (err) {
                    if (err) {
                        console.error(err);
                    }
                });
            });
            done();
        }
    },
    model: {
        find: function (context, source, done) {
            done(null, form.select(source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the model of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        },
        render: function (ctx, vform, data, value, done) {
            var context = {};
            updateModels(context, vform.elem, data.make, data.model, function (err) {
                if (err) {
                    return done(err);
                }
                done(null, context);
            });
        }
    },
    condition: {
        find: function (context, source, done) {
            done(null, $('input:checked', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the condition of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    transmission: {
        find: function (context, source, done) {
            done(null, $('input:checked', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the transmission of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    fuel: {
        find: function (context, source, done) {
            done(null, $('input:checked', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please select the fuel of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    color: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter the color of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
    mileage: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter the mileage of your vehicle');
            }
            value = Number(value);
            if (!is.number(value)) {
                return done(null, 'Please enter a valid number for the mileage of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
    price: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter the price of your vehicle');
            }
            value = Number(value);
            if (!is.number(value)) {
                return done(null, 'Please enter a valid amount for the price of your vehicle');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
    currency: {
        find: function (context, source, done) {
            done(null, 'LKR');
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    },
    description: {
        find: function (context, source, done) {
            done(null, $('textarea', source).val());
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        }
    }
};

var create = function (data, update, done) {
    $.ajax({
        url: AUTO_API + (update ? '/' + data.id : ''),
        type: update ? 'PUT' : 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (data) {
            done(null, data);
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

var remove = function (id, done) {
    $.ajax({
        url: AUTO_API + '/' + id,
        type: 'DELETE',
        success: function (data) {
            done(null, data);
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

var step = function (elem, button, name, next) {
    button.find('.content').text(next);
    button.data('step', name);
    if (name === 'location') {
        $('.step-vehicle', elem).addClass('hidden');
        return;
    }
    if (name === 'vehicle') {
        $('.step-' + name, elem).removeClass('hidden');
    }
};

var add = function (id, update, vform, images, elem) {
    $('.help-block', elem).addClass('hidden');
    var add = $(this).attr('disabled', true);
    var spinner = $('.spinner', add).removeClass('hidden');
    vform.find(function (err, data) {
        if (err) {
            return console.error(err);
        }
        vform.validate(data, function (err, errors, data) {
            if (err) {
                return console.error(err);
            }
            if (errors) {
                vform.update(errors, data, function (err) {
                    if (err) {
                        return console.error(err);
                    }
                    add.removeAttr('disabled');
                });
                return;
            }
            if (update) {
                data.id = id;
            }
            data.images = _.values(images);
            vform.create(data, function (err, errors, data) {
                if (err) {
                    return console.error(err);
                }
                if (errors) {
                    vform.update(errors, data, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        add.removeAttr('disabled');
                    });
                    return;
                }
                var done = function (err) {
                    spinner.addClass('hidden');
                    if (err) {
                        console.error('error while updating/creating the vehicle');
                        return add.removeAttr('disabled');
                    }
                    console.log('data updated/created successfully');
                    add.find('.content').text('Added');
                };
                create(data, update, done);
            });
        });
    });
};

var updateModels = function (ctx, elem, make, model, done) {
    ctx = ctx || {};
    var el = $('.model', elem);
    if (!ctx.modelSelect) {
        ctx.modelSelect = form.selectize(form.select(el));
    }
    if (!make) {
        ctx.modelSelect.addOption({value: '', text: 'Model'});
        return done();
    }
    Model.find(make.id, function (err, models) {
        if (err) {
            return done(err);
        }
        ctx.modelSelect.clearOptions();
        models.forEach(function (m) {
            ctx.modelSelect.addOption({value: m.id, text: m.title});
        });
        if (model) {
            ctx.modelSelect.setValue(model.id);
        }
        done();
    });
};

var render = function (ctx, sandbox, data, done) {
    var update = data._.update;
    var id = data.id;
    var images = {};
    var index = 0;
    if (data.images) {
        data.images.forEach(function (image) {
            images[index++] = image;
        });
    }
    Make.find(function (err, makes) {
        if (err) {
            return done(err);
        }
        data._.makes = makes;
        dust.render('vehicles-create', data, function (err, out) {
            if (err) {
                return done(err);
            }
            var elem = sandbox.append(out);
            var vform = form.create(elem, configs);
            vform.render(ctx, data, function (err) {
                if (err) {
                    return done(err);
                }
                var later = null;
                var pending = {};
                var count = 0;
                $('.fileupload', elem).fileupload({
                    url: BINARY_API,
                    type: 'POST',
                    dataType: 'json',
                    formData: [{
                        name: 'data',
                        value: JSON.stringify({
                            type: 'image'
                        })
                    }],
                    acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
                    maxFileSize: 5000000, // 5 MB
                    disableImageResize: /Android(?!.*Chrome)|Opera/.test(window.navigator.userAgent),
                    previewMaxWidth: 180,
                    previewMaxHeight: 120,
                    previewCrop: true
                }).on('fileuploaddone', function (e, data) {
                    var file = data.files[0];
                    var err = file.error;
                    if (err) {
                        return console.error(err);
                    }
                    images[data.index] = data.result.id;
                    delete pending[data.index];
                    count--;
                    if (count === 0 && later) {
                        later();
                    }
                    console.log('successfully uploaded %s', data.result.id);
                }).on('fileuploadadd', function (e, data) {
                    var file = data.files[0];
                    data.context = $('<div class="col-md-3 file"></div>');
                    data.index = index++;
                    dust.render('vehicles-create-preview', {
                        name: file.name,
                        index: data.index
                    }, function (err, out) {
                        if (err) {
                            return console.error(err);
                        }
                        data.context.append(out);
                        $('.files', elem).append(data.context);
                    });
                    count++;
                }).on('fileuploadprocessalways', function (e, data) {
                    var file = data.files[0];
                    var err = file.error;
                    if (err) {
                        return console.error(err);
                    }
                    $('.thumbnail', data.context).append(file.preview);
                }).prop('disabled', !$.support.fileInput)
                    .parent().addClass($.support.fileInput ? undefined : 'disabled');

                $('.next', elem).click(function (e) {
                    e.stopPropagation();
                    var context;
                    var thiz = $(this);
                    var name = thiz.data('step');
                    if (name === 'location') {
                        context = vform.context('location');
                        context.eventer.emit('find', function (err, data) {
                            if (err) {
                                return console.error(err);
                            }
                            context.eventer.emit('validate', data, function (err, errors, data) {
                                if (err) {
                                    return console.error(err);
                                }
                                context.eventer.emit('update', errors, data, function (err) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    if (errors) {
                                        return;
                                    }
                                    context.eventer.emit('collapse', function (err) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                        step(elem, thiz, 'vehicle', 'Add');
                                    });
                                });
                            });
                        });
                        return false;
                    }
                    if (name === 'vehicle') {
                        var create = function () {
                            add(id, update, vform, images, elem);
                        };
                        if (count > 0) {
                            later = create;
                            return;
                        }
                        return create();
                    }
                    console.error('unknown step: %s', name);
                });
                $('.delete', elem).click(function (e) {
                    e.stopPropagation();
                    remove(id, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log('data deleted successfully');
                    });
                    return false;
                });
                $(elem).on('click', '.remove-file', function () {
                    var el = $(this);
                    var index = el.data('index');
                    delete pending[index];
                    delete images[index];
                    el.closest('.file').remove();
                    return false;
                });
                done(null, function () {
                    $('.vehicles-create', sandbox).remove();
                });
            });
        });
    });
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    options = options || {};
    var id = options.id;
    if (!id) {
        render(ctx, sandbox, {
            _: {}
        }, done);
        return;
    }
    Vehicle.findOne({
        id: id,
        images: '288x162'
    }, function (err, vehicle) {
        if (err) {
            return done(err);
        }
        vehicle._.update = true;
        render(ctx, sandbox, vehicle, done);
    });
};
