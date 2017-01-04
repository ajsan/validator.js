# validator.js
此组件意在提供一个简单、全面的校验，此组件的优势是:

0. 初始化简单。只需要传递你需要校验的form表单元素.
0. 支持自定义校验规则。
0. 元素支持多个校验规则并行.
0.校验规则支持异步回调(ajax).


使用方式
-----
html结构
```html
<form action="" id="form">
		<input type="text" data-jvalidator="notEmpty & max10">
		<span id="tips"></span>
	</form>
  <button id="submit" onclick="check()">提交订单</button>
```
js初始化
```javascript
var tipsEl  = document.getElementById("tips");
		var validatorGroup = new validatorManager(document.getElementById("form"), {
			on : {
				valid : function(pattern){
					tipsEl.style.color = "#0f0;"
					tips.innerHTML = "";
				},
				invalid :  function(pattern){
					tipsEl.style.color = "#f00;"
					tips.innerHTML = pattern[0].msg;

				}
			}
		});
		validatorManager.addPattern({
			name: "notEmpty",
			msg: "错误时候的提示",
			callback: function(value, cb) {
				value = value.trim();
				cb(value != "");
			}
		})
		validatorManager.addPattern({
			name: "max10",
			msg: "最大不能超过10个字符",
			callback: function(value, cb) {
				value = value.trim();
				cb(value.length <= 10);
			}
		})
		function check(){
			validatorGroup.validateAll(function(result){
				alert(result);
			})
		}
```
