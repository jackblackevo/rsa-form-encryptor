var jsencryptModule = require('jsencrypt')
var JSEncrypt = jsencryptModule.JSEncrypt

;
(function () {
  'use strict'

  function encryptForm(jsEncrypt, formFieldsData, isEncryptFieldName) {
    var encryptedFormFieldsData = {}

    // Add timestamp
    var time = new Date().getTime()
    formFieldsData['t'] = formFieldsData['t'] ? formFieldsData['t'].unshift(time) : [time]

    if (isEncryptFieldName) {
      var value = jsEncrypt.encrypt(generateQueryString(formFieldsData, false))
      if (!value) {
        throw new Error('Nothing to encrypt, check the form.')
      }

      encryptedFormFieldsData['d'] = [value]

      value = undefined
    } else {
      Object.keys(formFieldsData).forEach(function (key) {
        var values = formFieldsData[key]

        encryptedFormFieldsData[key] = values.map(function (element) {
          var value = jsEncrypt.encrypt(element)
          if (!value) {
            throw new Error('Nothing to encrypt, check the form.')
          }

          return value
        })
      })
    }

    return encryptedFormFieldsData
  }

  function formEncode(str) {
    // For application/x-www-form-urlencoded, spaces are to be replaced by '+'.
    return encodeURIComponent(str).replace(/%20/g, '+')
  }

  function generateQueryString(formFieldsData, isEncode) {
    return Object.keys(formFieldsData).reduce(function (queryString, key) {
      var key = isEncode ? formEncode(key) : key
      var values = formFieldsData[key]

      Array.prototype.forEach.call(values, function (value) {
        var value = isEncode ? formEncode(value) : value

        if (typeof value === 'string') {
          queryString += (queryString ? '&' : '') + key + '=' + value
        }
      })

      return queryString
    }, '')
  }

  function combineFormFieldsData(formFieldsDataArray) {
    return formFieldsDataArray.reduce(function (combinedFormFieldsData, formFieldsData) {
      Object.keys(formFieldsData).forEach(function (key) {
        combinedFormFieldsData[key] = combinedFormFieldsData[key] ? combinedFormFieldsData[key].concat(formFieldsData[key]) : combinedFormFieldsData[key] = formFieldsData[key]
      })

      return combinedFormFieldsData
    }, {})
  }

  function getFormFieldsData(formId) {
    var formElem = document.forms[formId]

    return Array.prototype.filter.call(formElem.elements, function (field) {
      return field.name && !field.disabled && field.type !== 'file' && field.type !== 'reset' && field.type !== 'submit' && field.type !== 'button'
    }).reduce(function (formFieldsData, field) {
      if (field.type === 'select-multiple') {
        // select (multiple)
        formFieldsData[field.name] = []

        Array.prototype.reduce.call(field.options, function (formFieldsDataAtField, option) {
          option.selected && formFieldsDataAtField.push(option.value)

          return formFieldsDataAtField
        }, formFieldsData[field.name])
      } else if (field.type === 'checkbox') {
        // checkbox (multiple or single)
        formFieldsData[field.name] = formFieldsData[field.name] || []

        field.checked && formFieldsData[field.name].push(field.value)
      } else if (field.type !== 'radio' || field.checked) {
        // input (text, radio...), select (single)
        formFieldsData[field.name] = [field.value]
      }

      return formFieldsData
    }, {})
  }

  function FormEncryptor(pemString) {
    if (!this || this === window) {
      throw new TypeError('Uncaught TypeError: Failed to construct \'FormEncryptor\': Please use the \'new\' operator, this DOM object constructor cannot be called as a function.')
    }

    if (!pemString) {
      throw new Error('Require: RSA public key.')
    }

    this._pem = pemString
    this._jsEncrypt = new JSEncrypt()

    this._jsEncrypt.setPublicKey(this._pem)
  }

  FormEncryptor.prototype.encryptToQueryString = function (formId, isEncryptFieldName) {
    isEncryptFieldName = isEncryptFieldName === undefined ? true : !!isEncryptFieldName

    var formFieldsData = getFormFieldsData(formId)
    var encryptedFormFieldsData = encryptForm(this._jsEncrypt, formFieldsData, isEncryptFieldName)
    // Add encrypted and isEncryptFieldName flag
    var queryString = generateQueryString(encryptedFormFieldsData, true) + '&e=true&f=' + isEncryptFieldName

    return queryString
  }

  FormEncryptor.prototype.encryptAndSubmit = function (formId, targetUrl, options) {
    if (!formId || !targetUrl) {
      throw new Error('Require: Form ID, Target URL.')
    }

    var isAjax = options && !!options.ajax || false
    var isAsync = options && !!options.async || false
    var responseType = options && options.responseType || ''
    var isEncryptFieldName = (options && options.encryptFieldName) === undefined ? true : !!options.encryptFieldName
    var method = options && options.method || 'POST'
    var callback = options && options.callback || function () {
      console.log('ajax done.')
    }

    var otherFormIDs = []
    if (options && options.otherFormIDs) {
      otherFormIDs = options.otherFormIDs instanceof Array ? options.otherFormIDs : [options.otherFormIDs]
    }

    var otherFormFieldsDataArray = otherFormIDs.map(function (id) {
      return getFormFieldsData(id)
    })

    if (isAjax) {
      var xhr = new XMLHttpRequest()
      xhr.responseType = responseType
      xhr.addEventListener('load', callback)

      var data = this.encryptToQueryString(formId, isEncryptFieldName)
      var combinedFormFieldsData = combineFormFieldsData(otherFormFieldsDataArray)
      var str = generateQueryString(combinedFormFieldsData, true)
      data += (str ? '&' : '') + str

      if (method.toUpperCase() === 'POST') {
        xhr.open('post', targetUrl, isAsync)
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        xhr.send(data)
      } else if (method.toUpperCase() === 'GET') {
        xhr.open('get', targetUrl + '?' + data, isAsync)
        xhr.send()
      } else {
        throw new Error('Only support method: POST, GET.')
      }

      data = undefined
      combinedFormFieldsData = undefined
      str = undefined
      xhr = undefined
    } else {
      var formFieldsData = getFormFieldsData(formId)
      var encryptedFormFieldsData = encryptForm(this._jsEncrypt, formFieldsData, isEncryptFieldName)
      var combinedFormFieldsData = combineFormFieldsData(otherFormFieldsDataArray.concat(encryptedFormFieldsData))
      // Add encrypted and isEncryptFieldName flag
      combinedFormFieldsData['e'] = combinedFormFieldsData['e'] ? combinedFormFieldsData['e'].unshift(true) : [true]
      combinedFormFieldsData['f'] = combinedFormFieldsData['f'] ? combinedFormFieldsData['f'].unshift(isEncryptFieldName) : [isEncryptFieldName]

      var formElem = Object.keys(combinedFormFieldsData).reduce(function (formElem, key) {
        combinedFormFieldsData[key].forEach(function (value) {
          var inputElem = document.createElement('input')
          inputElem.name = key
          inputElem.value = value
          formElem.appendChild(inputElem)
        })

        return formElem
      }, document.createElement('form'))

      formElem.hidden = true
      formElem.method = method
      formElem.action = targetUrl

      document.body.appendChild(formElem)
      formElem.submit()
      document.body.removeChild(formElem)

      formFieldsData = undefined
      encryptedFormFieldsData = undefined
      combinedFormFieldsData = undefined
      formElem = undefined
    }
  }

  window.FormEncryptor = FormEncryptor
})()